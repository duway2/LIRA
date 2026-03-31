package models

import (
	"time"
)

type Member struct {
	ID               int64      `json:"id" db:"id"`
	UserID           int64      `json:"user_id" db:"user_id"`
	MemberCode       *string    `json:"member_code" db:"member_code"`
	FullName         *string    `json:"full_name" db:"full_name"`
	Phone            *string    `json:"phone" db:"phone"`
	IdentityPhotoURL *string    `json:"identity_photo_url" db:"identity_photo_url"`
	ProfilePhotoURL  *string    `json:"profile_photo_url" db:"profile_photo_url"`
	City             *string    `json:"city" db:"city"`
	Province         *string    `json:"province" db:"province"`
	TermsAccepted    bool       `json:"terms_accepted" db:"terms_accepted"`
	Bio              *string    `json:"bio" db:"bio"`
	Status           string     `json:"status" db:"status"` // 'active', 'inactive', 'pending', 'rejected'
	MembershipStart  *time.Time `json:"membership_start" db:"membership_start"`
	MembershipExpiry *time.Time `json:"membership_expiry" db:"membership_expiry"`
	BarcodeData      *string    `json:"barcode_data" db:"barcode_data"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`

	// Joined from User
	Email string `json:"email,omitempty" db:"email"`
}

type MemberProfileRequest struct {
	FullName      string `json:"full_name" binding:"required"`
	Phone         string `json:"phone" binding:"required"`
	City          string `json:"city" binding:"required"`
	Province      string `json:"province" binding:"required"`
	TermsAccepted bool   `json:"terms_accepted"`
	Bio           string `json:"bio"`
}
