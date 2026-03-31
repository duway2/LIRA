package repository

import (
	"database/sql"
	"errors"

	"github.com/jmoiron/sqlx"
	"github.com/lira/backend/internal/models"
)

type MemberRepository interface {
	CreateMember(member *models.Member) error
	GetMemberByUserID(userID int64) (*models.Member, error)
	GetMemberByID(id int64) (*models.Member, error)
	UpdateMember(member *models.Member) error
	GetAllMembers() ([]models.Member, error)
}

type memberRepository struct {
	db *sqlx.DB
}

func NewMemberRepository(db *sqlx.DB) MemberRepository {
	return &memberRepository{db: db}
}

func (r *memberRepository) CreateMember(member *models.Member) error {
	query := `INSERT INTO members (
		user_id, member_code, full_name, phone, identity_photo_url, profile_photo_url, 
		city, province, terms_accepted, bio, status, membership_start, membership_expiry, barcode_data
	) VALUES (
		:user_id, :member_code, :full_name, :phone, :identity_photo_url, :profile_photo_url,
		:city, :province, :terms_accepted, :bio, :status, :membership_start, :membership_expiry, :barcode_data
	)`

	result, err := r.db.NamedExec(query, member)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err == nil {
		member.ID = id
	}
	return err
}

func (r *memberRepository) GetMemberByUserID(userID int64) (*models.Member, error) {
	var member models.Member

	// Join users table to get email
	query := `
		SELECT m.*, u.email 
		FROM members m 
		JOIN users u ON m.user_id = u.id 
		WHERE m.user_id = ? LIMIT 1
	`
	err := r.db.Get(&member, query, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &member, nil
}

func (r *memberRepository) GetMemberByID(id int64) (*models.Member, error) {
	var member models.Member
	err := r.db.Get(&member, "SELECT * FROM members WHERE id = ? LIMIT 1", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &member, nil
}

func (r *memberRepository) GetAllMembers() ([]models.Member, error) {
	var members []models.Member
	query := `
		SELECT m.*, u.email 
		FROM members m 
		JOIN users u ON m.user_id = u.id 
		ORDER BY m.created_at DESC
	`
	err := r.db.Select(&members, query)
	if err != nil {
		return nil, err
	}
	return members, nil
}

func (r *memberRepository) UpdateMember(member *models.Member) error {
	query := `UPDATE members SET 
		member_code = :member_code, full_name = :full_name, phone = :phone, 
		identity_photo_url = :identity_photo_url, profile_photo_url = :profile_photo_url, 
		city = :city, province = :province, terms_accepted = :terms_accepted, bio = :bio, status = :status, 
		membership_start = :membership_start, membership_expiry = :membership_expiry, 
		barcode_data = :barcode_data 
	WHERE id = :id`

	_, err := r.db.NamedExec(query, member)
	return err
}
