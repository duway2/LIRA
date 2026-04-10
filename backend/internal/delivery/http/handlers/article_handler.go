package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lira/backend/internal/models"
	"github.com/lira/backend/internal/service"
	"github.com/lira/backend/pkg/utils"
)

type ArticleHandler struct {
	articleSvc service.ArticleService
}

func NewArticleHandler(articleSvc service.ArticleService) *ArticleHandler {
	return &ArticleHandler{articleSvc: articleSvc}
}

// === Public Endpoints ===

func (h *ArticleHandler) GetPublicArticles(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	articles, err := h.articleSvc.ListArticles("published", 0, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch articles"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"articles": articles})
}

func (h *ArticleHandler) GetArticleBySlug(c *gin.Context) {
	slug := c.Param("slug")
	article, err := h.articleSvc.GetArticle(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"article": article})
}

func (h *ArticleHandler) GetCategories(c *gin.Context) {
	categories, err := h.articleSvc.GetCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// === Protected Endpoints (For Members / Authors) ===

func (h *ArticleHandler) CreateArticle(c *gin.Context) {
	userID := c.GetInt64("userID")
	role := c.GetString("userRole")

	var req models.CreateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	article, err := h.articleSvc.CreateArticle(userID, role, &req)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "only active members can submit articles") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Article saved", "article": article})
}

func (h *ArticleHandler) GetMyArticles(c *gin.Context) {
	userID := c.GetInt64("userID")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	status := c.Query("status") // optional filter
	
	articles, err := h.articleSvc.ListArticles(status, userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"articles": articles})
}

// UploadImage for TipTap editor inline attachments
func (h *ArticleHandler) UploadImage(c *gin.Context) {
	userID := c.GetInt64("userID")
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image file is required"})
		return
	}

	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File exceeds 5MB"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image format"})
		return
	}

	uploadDir, err := utils.EnsureUploadSubDir("articles")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare upload directory"})
		return
	}

	filename := fmt.Sprintf("%d_%s", userID, filepath.Base(file.Filename)) 
	// Make sure no spaces or dangerous chars, for safety we should randomize, 
	// but keeping it simple for now. 
	filename = strings.ReplaceAll(filename, " ", "_")
	
	dst := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// This is standard format expected by most WYSIWYG uploaders (TipTap / EditorJS)
	c.JSON(http.StatusOK, gin.H{
		"success": 1,
		"file": map[string]string{
			"url": "/uploads/articles/" + filename,
		},
	})
}

// === Editor / Admin Endpoints ===

func (h *ArticleHandler) AdminGetArticles(c *gin.Context) {
	// Should ideally check role here
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	status := c.Query("status") // can be empty for all

	articles, err := h.articleSvc.ListArticles(status, 0, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch admin articles"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"articles": articles})
}

func (h *ArticleHandler) ReviewArticle(c *gin.Context) {
	// Require role checked via middleware in routing
	editorID := c.GetInt64("userID")
	articleID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.articleSvc.ReviewArticle(editorID, articleID, req.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Article status updated strictly"})
}
