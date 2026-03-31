package models

import "time"

type Category struct {
	ID   int64  `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
	Slug string `json:"slug" db:"slug"`
}

type Article struct {
	ID               int64      `json:"id" db:"id"`
	AuthorID         int64      `json:"author_id" db:"author_id"`
	CategoryID       *int64     `json:"category_id" db:"category_id"`
	Title            string     `json:"title" db:"title"`
	Slug             string     `json:"slug" db:"slug"`
	Content          string     `json:"content" db:"content"` // TipTap HTML
	FeaturedImageURL *string    `json:"featured_image_url" db:"featured_image_url"`
	Status           string     `json:"status" db:"status"` // 'draft', 'review', 'published', 'rejected'
	ViewCount        int        `json:"view_count" db:"view_count"`
	PublishedAt      *time.Time `json:"published_at" db:"published_at"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`

	// Joins for response readability
	AuthorName   string  `json:"author_name,omitempty" db:"author_name"`
	CategoryName *string `json:"category_name,omitempty" db:"category_name"`
}

type CreateArticleRequest struct {
	Title            string  `json:"title" binding:"required"`
	CategoryID       *int64  `json:"category_id"`
	Content          string  `json:"content" binding:"required"`
	FeaturedImageURL *string `json:"featured_image_url"`
}

type UpdateArticleRequest struct {
	Title            *string `json:"title"`
	CategoryID       *int64  `json:"category_id"`
	Content          *string `json:"content"`
	FeaturedImageURL *string `json:"featured_image_url"`
	Status           *string `json:"status"` // E.g., submit from draft to review
}
