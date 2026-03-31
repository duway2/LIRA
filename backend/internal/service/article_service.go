package service

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/lira/backend/internal/models"
	"github.com/lira/backend/internal/repository"
)

type ArticleService interface {
	CreateArticle(authorID int64, role string, req *models.CreateArticleRequest) (*models.Article, error)
	GetArticle(slug string) (*models.Article, error)
	GetArticleByID(id int64) (*models.Article, error)
	UpdateArticle(authorID int64, role string, articleID int64, req *models.UpdateArticleRequest) (*models.Article, error)
	ReviewArticle(editorID int64, articleID int64, status string) error
	ListArticles(status string, authorID int64, limit, offset int) ([]models.Article, error)
	GetCategories() ([]models.Category, error)
}

type articleService struct {
	articleRepo repository.ArticleRepository
	memberRepo  repository.MemberRepository
}

func NewArticleService(articleRepo repository.ArticleRepository, memberRepo repository.MemberRepository) ArticleService {
	return &articleService{
		articleRepo: articleRepo,
		memberRepo:  memberRepo,
	}
}

func generateSlug(title string) string {
	toLowerCase := strings.ToLower(title)
	reg := regexp.MustCompile("[^a-z0-9]+")
	slug := reg.ReplaceAllString(toLowerCase, "-")
	slug = strings.Trim(slug, "-")
	return slug + fmt.Sprintf("-%d", time.Now().Unix()) // appending timestamp prevents duplicates
}

func (s *articleService) CreateArticle(authorID int64, role string, req *models.CreateArticleRequest) (*models.Article, error) {
	if role == "member" {
		memberProfile, err := s.memberRepo.GetMemberByUserID(authorID)
		if err != nil {
			return nil, err
		}

		if memberProfile == nil || memberProfile.Status != "active" {
			return nil, errors.New("only active members can submit articles")
		}
	}

	// Status workflow
	initialStatus := "review" // Member submissions go to review
	if role == "admin" || role == "editor" {
		initialStatus = "published"
	}

	slug := generateSlug(req.Title)

	article := &models.Article{
		AuthorID:         authorID,
		CategoryID:       req.CategoryID,
		Title:            req.Title,
		Slug:             slug,
		Content:          req.Content,
		FeaturedImageURL: req.FeaturedImageURL,
		Status:           initialStatus,
	}

	if initialStatus == "published" {
		now := time.Now()
		article.PublishedAt = &now
	}

	err := s.articleRepo.CreateArticle(article)
	if err != nil {
		return nil, err
	}
	return article, nil
}

func (s *articleService) GetArticle(slug string) (*models.Article, error) {
	article, err := s.articleRepo.GetArticleBySlug(slug)
	if err != nil {
		return nil, err
	}
	if article == nil {
		return nil, errors.New("article not found")
	}

	// Increment view count if published (simple implementation, real world might use Redis cache to prevent abuse)
	if article.Status == "published" {
		article.ViewCount += 1
		s.articleRepo.UpdateArticle(article) // Fire & forget
	}

	return article, nil
}

func (s *articleService) GetArticleByID(id int64) (*models.Article, error) {
	article, err := s.articleRepo.GetArticleByID(id)
	if err != nil || article == nil {
		return nil, errors.New("article not found")
	}
	return article, nil
}

func (s *articleService) UpdateArticle(authorID int64, role string, articleID int64, req *models.UpdateArticleRequest) (*models.Article, error) {
	article, err := s.GetArticleByID(articleID)
	if err != nil {
		return nil, err
	}

	// Must be owner or admin/editor
	if article.AuthorID != authorID && role != "admin" && role != "editor" {
		return nil, errors.New("unauthorized to edit this article")
	}

	if req.Title != nil {
		article.Title = *req.Title
		article.Slug = generateSlug(*req.Title) // Optional
	}
	if req.Content != nil {
		article.Content = *req.Content
	}
	if req.CategoryID != nil {
		article.CategoryID = req.CategoryID
	}
	if req.FeaturedImageURL != nil {
		article.FeaturedImageURL = req.FeaturedImageURL
	}
	if req.Status != nil && (*req.Status == "draft" || *req.Status == "review") {
		article.Status = *req.Status
	}

	err = s.articleRepo.UpdateArticle(article)
	return article, err
}

func (s *articleService) ReviewArticle(editorID int64, articleID int64, status string) error {
	article, err := s.GetArticleByID(articleID)
	if err != nil {
		return err
	}

	if status != "published" && status != "rejected" && status != "draft" {
		return errors.New("invalid status update")
	}

	article.Status = status
	if status == "published" {
		now := time.Now()
		article.PublishedAt = &now
	}

	return s.articleRepo.UpdateArticle(article)
}

func (s *articleService) ListArticles(status string, authorID int64, limit, offset int) ([]models.Article, error) {
	filter := repository.StatusFilter{
		Status:   status,
		AuthorID: authorID,
	}
	return s.articleRepo.ListArticles(filter, limit, offset)
}

func (s *articleService) GetCategories() ([]models.Category, error) {
	return s.articleRepo.GetCategories()
}
