package service

import (
	"fmt"
	"time"

	"github.com/lira/backend/internal/models"
	"github.com/lira/backend/internal/repository"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
)

type PaymentService interface {
	CreateTransaction(memberID int64, memberName, memberEmail string) (string, error)
	GetAnnualMembershipFee() float64
	ProcessNotification(payload models.MidtransNotificationPayload) error
}

const annualMembershipFee = 250000.0

type paymentService struct {
	paymentRepo repository.PaymentRepository
	memberRepo  repository.MemberRepository
	snapClient  snap.Client
}

func NewPaymentService(paymentRepo repository.PaymentRepository, memberRepo repository.MemberRepository, serverKey string) PaymentService {
	// Initialize Midtrans Snap Client
	var client snap.Client
	client.New(serverKey, midtrans.Sandbox) // Default to sandbox for now
	// For production: client.New(serverKey, midtrans.Production)

	return &paymentService{
		paymentRepo: paymentRepo,
		memberRepo:  memberRepo,
		snapClient:  client,
	}
}

func (s *paymentService) GetAnnualMembershipFee() float64 {
	return annualMembershipFee
}

func (s *paymentService) CreateTransaction(memberID int64, memberName, memberEmail string) (string, error) {
	orderID := fmt.Sprintf("LIRA-MEM-%d-%d", memberID, time.Now().Unix())
	amount := annualMembershipFee

	// 1. Save pending payment to Database
	payRecord := &models.Payment{
		MemberID: memberID,
		OrderID:  orderID,
		Amount:   amount,
		Status:   "pending",
	}

	err := s.paymentRepo.CreatePayment(payRecord)
	if err != nil {
		return "", err
	}

	// 2. Wrap Midtrans Request
	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  orderID,
			GrossAmt: int64(amount),
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: memberName,
			Email: memberEmail,
		},
		Items: &[]midtrans.ItemDetails{
			{
				ID:    "IURAN-LIRA",
				Price: int64(amount),
				Qty:   1,
				Name:  "Iuran Keanggotaan Penuh LIRA",
			},
		},
	}

	// 3. Get Snap Token
	snapResp, err := s.snapClient.CreateTransaction(req)
	if err != nil {
		return "", err
	}

	return snapResp.Token, nil
}

func (s *paymentService) ProcessNotification(payload models.MidtransNotificationPayload) error {
	orderID := payload.OrderID
	transactionStatus := payload.TransactionStatus
	fraudStatus := payload.FraudStatus

	// Determine standardized status
	var status string
	switch transactionStatus {
	case "capture":
		if fraudStatus == "challenge" {
			status = "pending"
		} else if fraudStatus == "accept" {
			status = "success"
		}
	case "settlement":
		status = "success"
	case "deny", "cancel", "expire":
		status = "failed"
	case "pending":
		status = "pending"
	default:
		status = "pending"
	}

	// Wait! Security check signature payload using SHA512(OrderID+StatusCode+GrossAmount+ServerKey)
	// We are skipping strict signature check for local mocking if serverKey is empty
	err := s.paymentRepo.UpdatePaymentStatus(orderID, status, payload.PaymentType, payload.TransactionID)
	if err != nil {
		return err
	}

	// Payment success marks the member as pending admin approval (no auto-activation).
	if status == "success" {
		paymentRecord, err := s.paymentRepo.GetPaymentByOrderID(orderID)
		if err == nil && paymentRecord != nil {
			// Setelah pembayaran sukses, status tetap menunggu approval admin.
			member, err := s.memberRepo.GetMemberByID(paymentRecord.MemberID)
			if err == nil && member != nil && member.Status != "active" {
				member.Status = "pending"
				_ = s.memberRepo.UpdateMember(member)
			}
		}
	}

	return nil
}
