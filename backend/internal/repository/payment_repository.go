package repository

import (
	"database/sql"
	"errors"

	"github.com/jmoiron/sqlx"
	"github.com/lira/backend/internal/models"
)

type PaymentRepository interface {
	CreatePayment(payment *models.Payment) error
	GetPaymentByOrderID(orderID string) (*models.Payment, error)
	GetPaymentsByMemberID(memberID int64) ([]models.Payment, error)
	GetLatestSuccessfulPaymentByMemberID(memberID int64) (*models.Payment, error)
	UpdatePaymentStatus(orderID string, status string, paymentType, transactionID string) error
	UpdatePaymentInvoiceURL(orderID string, invoiceURL string) error
}

type paymentRepository struct {
	db *sqlx.DB
}

func NewPaymentRepository(db *sqlx.DB) PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) CreatePayment(p *models.Payment) error {
	query := `INSERT INTO payments (
		member_id, order_id, amount, status
	) VALUES (
		:member_id, :order_id, :amount, :status
	)`

	res, err := r.db.NamedExec(query, p)
	if err != nil {
		return err
	}

	id, err := res.LastInsertId()
	if err == nil {
		p.ID = id
	}
	return err
}

func (r *paymentRepository) GetPaymentByOrderID(orderID string) (*models.Payment, error) {
	var p models.Payment
	q := `SELECT p.*, m.full_name as full_name 
	      FROM payments p 
	      JOIN members m ON p.member_id = m.id 
	      WHERE p.order_id = ? LIMIT 1`
	err := r.db.Get(&p, q, orderID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *paymentRepository) GetPaymentsByMemberID(memberID int64) ([]models.Payment, error) {
	var payments []models.Payment
	q := `SELECT * FROM payments WHERE member_id = ? ORDER BY created_at DESC`
	err := r.db.Select(&payments, q, memberID)
	if err != nil {
		return nil, err
	}
	return payments, nil
}

func (r *paymentRepository) GetLatestSuccessfulPaymentByMemberID(memberID int64) (*models.Payment, error) {
	var payment models.Payment
	q := `SELECT * FROM payments WHERE member_id = ? AND status = 'success' ORDER BY created_at DESC LIMIT 1`
	err := r.db.Get(&payment, q, memberID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &payment, nil
}

func (r *paymentRepository) UpdatePaymentStatus(orderID string, status string, paymentType, transactionID string) error {
	q := `UPDATE payments SET 
			status = ?, 
			payment_type = ?, 
			midtrans_transaction_id = ? 
		  WHERE order_id = ?`

	_, err := r.db.Exec(q, status, paymentType, transactionID, orderID)
	return err
}

func (r *paymentRepository) UpdatePaymentInvoiceURL(orderID string, invoiceURL string) error {
	q := `UPDATE payments SET pdf_invoice_url = ? WHERE order_id = ?`
	_, err := r.db.Exec(q, invoiceURL, orderID)
	return err
}
