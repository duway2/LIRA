package utils

import (
	"os"
	"path/filepath"
	"strings"
)

// GetUploadsRootDir resolves a stable uploads directory across different run locations.
// Priority: UPLOADS_DIR env -> existing local candidates -> sensible fallback.
func GetUploadsRootDir() string {
	envDir := strings.TrimSpace(os.Getenv("UPLOADS_DIR"))
	if envDir != "" {
		if filepath.IsAbs(envDir) {
			return filepath.Clean(envDir)
		}

		if abs, err := filepath.Abs(envDir); err == nil {
			return filepath.Clean(abs)
		}

		return filepath.Clean(envDir)
	}

	cwd, err := os.Getwd()
	if err != nil || strings.TrimSpace(cwd) == "" {
		return "./uploads"
	}

	candidates := []string{
		filepath.Join(cwd, "uploads"),
		filepath.Join(cwd, "cmd", "api", "uploads"),
		filepath.Join(cwd, "backend", "cmd", "api", "uploads"),
	}

	for _, candidate := range candidates {
		if info, statErr := os.Stat(candidate); statErr == nil && info.IsDir() {
			return filepath.Clean(candidate)
		}
	}

	lowerCwd := strings.ToLower(filepath.ToSlash(cwd))
	if strings.HasSuffix(lowerCwd, "/backend") {
		return filepath.Clean(candidates[1])
	}

	if strings.HasSuffix(lowerCwd, "/cmd/api") {
		return filepath.Clean(candidates[0])
	}

	return filepath.Clean(candidates[0])
}

func EnsureUploadSubDir(subDir string) (string, error) {
	baseDir := GetUploadsRootDir()
	targetDir := filepath.Join(baseDir, filepath.FromSlash(strings.TrimPrefix(subDir, "/")))
	if err := os.MkdirAll(targetDir, os.ModePerm); err != nil {
		return "", err
	}

	return targetDir, nil
}