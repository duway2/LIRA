package models

import "time"

type Payment struct {
	ID                    int64     `json:"id" db:"id"`
	MemberID              int64     `json:"member_id" db:"member_id"`
	OrderID               string    `json:"order_id" db:"order_id"`
	Amount                float64   `json:"amount" db:"amount"`
	Status                string    `json:"status" db:"status"` // pending, success, failed, expired
	PaymentType           *string   `json:"payment_type" db:"payment_type"`
	MidtransTransactionID *string   `json:"midtrans_transaction_id" db:"midtrans_transaction_id"`
	PdfInvoiceUrl         *string   `json:"pdf_invoice_url" db:"pdf_invoice_url"`
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time `json:"updated_at" db:"updated_at"`

	// Joins
	MemberName *string `json:"member_name,omitempty" db:"full_name"`
}

type CheckoutRequest struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
}

type MidtransNotificationPayload struct {
	TransactionTime   string `json:"transaction_time"`
	TransactionStatus string `json:"transaction_status"`
	TransactionID     string `json:"transaction_id"`
	StatusMessage     string `json:"status_message"`
	StatusCode        string `json:"status_code"`
	SignatureKey      string `json:"signature_key"`
	PaymentType       string `json:"payment_type"`
	OrderID           string `json:"order_id"`
	MerchantID        string `json:"merchant_id"`
	GrossAmount       string `json:"gross_amount"`
	FraudStatus       string `json:"fraud_status"`
	Currency          string `json:"currency"`
}
