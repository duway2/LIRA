package repository

import (
	"database/sql"
	"errors"

	"github.com/jmoiron/sqlx"
	"github.com/lira/backend/internal/models"
)

type UserRepository interface {
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id int64) (*models.User, error)
	GetUsers() ([]models.User, error)
	UpdateUser(user *models.User) error
}

type userRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) CreateUser(user *models.User) error {
	query := `INSERT INTO users (email, password_hash, google_id, role, name, is_active, is_2fa_enabled) 
	          VALUES (:email, :password_hash, :google_id, :role, :name, :is_active, :is_2fa_enabled)`

	result, err := r.db.NamedExec(query, user)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	user.ID = id
	return nil
}

func (r *userRepository) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Get(&user, "SELECT * FROM users WHERE email = ? LIMIT 1", email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // Not found is not necessarily an error, just return nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetUserByID(id int64) (*models.User, error) {
	var user models.User
	err := r.db.Get(&user, "SELECT * FROM users WHERE id = ? LIMIT 1", id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetUsers() ([]models.User, error) {
	var users []models.User
	err := r.db.Select(&users, "SELECT id, email, role, name, is_active, is_2fa_enabled, created_at, updated_at FROM users ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (r *userRepository) UpdateUser(user *models.User) error {
	query := `UPDATE users 
	          SET email = :email, password_hash = :password_hash, google_id = :google_id, 
	              role = :role, name = :name, is_active = :is_active, is_2fa_enabled = :is_2fa_enabled 
	          WHERE id = :id`

	_, err := r.db.NamedExec(query, user)
	return err
}
