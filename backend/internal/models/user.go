package models

import "time"

type User struct {
	ID           int64     `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	GoogleID     *string   `json:"google_id" db:"google_id"`
	Role         string    `json:"role" db:"role"`
	Name         string    `json:"name" db:"name"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	Is2FAEnabled bool      `json:"is_2fa_enabled" db:"is_2fa_enabled"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type AuthRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}
