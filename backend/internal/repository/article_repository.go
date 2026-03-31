package repository

import (
	"database/sql"
	"errors"

	"github.com/jmoiron/sqlx"
	"github.com/lira/backend/internal/models"
)

type ArticleRepository interface {
	CreateArticle(article *models.Article) error
	GetArticleByID(id int64) (*models.Article, error)
	GetArticleBySlug(slug string) (*models.Article, error)
	UpdateArticle(article *models.Article) error
	ListArticles(filterParam StatusFilter, limit, offset int) ([]models.Article, error)
	
	// Categories
	GetCategories() ([]models.Category, error)
}

type memberRepositoryImpl struct {
	db *sqlx.DB
}

// Reusing pattern
type articleRepository struct {
	db *sqlx.DB
}

func NewArticleRepository(db *sqlx.DB) ArticleRepository {
	return &articleRepository{db: db}
}

type StatusFilter struct {
	Status   string // 'published', 'review', 'draft', etc. Empty means all.
	AuthorID int64  // 0 means any
}

func (r *articleRepository) CreateArticle(a *models.Article) error {
	query := `INSERT INTO articles (
		author_id, category_id, title, slug, content, featured_image_url, status
	) VALUES (
		:author_id, :category_id, :title, :slug, :content, :featured_image_url, :status
	)`
	
	res, err := r.db.NamedExec(query, a)
	if err != nil {
		return err
	}
	
	id, err := res.LastInsertId()
	if err == nil {
		a.ID = id
	}
	return err
}

func (r *articleRepository) GetArticleByID(id int64) (*models.Article, error) {
	var a models.Article
	q := `SELECT a.*, u.name as author_name, c.name as category_name
	      FROM articles a
	      JOIN users u ON a.author_id = u.id
	      LEFT JOIN categories c ON a.category_id = c.id
	      WHERE a.id = ? LIMIT 1`
	err := r.db.Get(&a, q, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *articleRepository) GetArticleBySlug(slug string) (*models.Article, error) {
	var a models.Article
	q := `SELECT a.*, u.name as author_name, c.name as category_name
	      FROM articles a
	      JOIN users u ON a.author_id = u.id
	      LEFT JOIN categories c ON a.category_id = c.id
	      WHERE a.slug = ? LIMIT 1`
	err := r.db.Get(&a, q, slug)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *articleRepository) UpdateArticle(a *models.Article) error {
	q := `UPDATE articles SET
		category_id = :category_id, title = :title, slug = :slug,
		content = :content, featured_image_url = :featured_image_url,
		status = :status, view_count = :view_count, published_at = :published_at
	WHERE id = :id`
	
	_, err := r.db.NamedExec(q, a)
	return err
}

func (r *articleRepository) ListArticles(f StatusFilter, limit, offset int) ([]models.Article, error) {
	var articles []models.Article
	
	baseQuery := `SELECT a.*, u.name as author_name, c.name as category_name
	              FROM articles a
	              JOIN users u ON a.author_id = u.id
	              LEFT JOIN categories c ON a.category_id = c.id
	              WHERE 1=1 `
	
	args := []interface{}{}
	
	if f.Status != "" {
		baseQuery += " AND a.status = ?"
		args = append(args, f.Status)
	}
	
	if f.AuthorID > 0 {
		baseQuery += " AND a.author_id = ?"
		args = append(args, f.AuthorID)
	}
	
	baseQuery += " ORDER BY a.created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)
	
	err := r.db.Select(&articles, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	
	return articles, nil
}

// --- Categories --- //
func (r *articleRepository) GetCategories() ([]models.Category, error) {
	var categories []models.Category
	err := r.db.Select(&categories, "SELECT * FROM categories ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	return categories, nil
}
