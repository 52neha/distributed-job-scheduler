package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CreateJobRequest struct {
	Name         string `json:"name"`
	Description  string `json:"description"`
	ScheduleType string `json:"schedule_type"`
}

func createJobHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

		var request CreateJobRequest
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()

		if err := decoder.Decode(&request); err != nil {
			http.Error(w, "Invalid JSON request", http.StatusBadRequest)
			return
		}

		if err := decoder.Decode(&struct{}{}); err != io.EOF {
			http.Error(w, "Request must contain one JSON object", http.StatusBadRequest)
			return
		}

		request.Name = strings.TrimSpace(request.Name)
		request.Description = strings.TrimSpace(request.Description)
		request.ScheduleType = strings.TrimSpace(request.ScheduleType)

		if request.Name == "" {
			http.Error(w, "Job name is required", http.StatusBadRequest)
			return
		}
		if utf8.RuneCountInString(request.Name) > 150 {
			http.Error(w, "Job name cannot exceed 150 characters", http.StatusBadRequest)
			return
		}

		if request.ScheduleType == "" {
			request.ScheduleType = "one_time"
		}
		if request.ScheduleType != "one_time" &&
			request.ScheduleType != "recurring" {
			http.Error(w, "Invalid schedule_type", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var job Job
		err := db.QueryRow(ctx, `
			INSERT INTO jobs (name, description, schedule_type)
			VALUES ($1, NULLIF($2, ''), $3)
			RETURNING
				id::text,
				name,
				COALESCE(description, ''),
				status,
				schedule_type,
				created_at,
				updated_at
		`,
			request.Name,
			request.Description,
			request.ScheduleType,
		).Scan(
			&job.ID,
			&job.Name,
			&job.Description,
			&job.Status,
			&job.ScheduleType,
			&job.CreatedAt,
			&job.UpdatedAt,
		)

		if err != nil {
			log.Printf("Failed to create job: %v", err)
			http.Error(w, "Failed to create job", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		if err := json.NewEncoder(w).Encode(job); err != nil {
			log.Printf("Failed to encode created job: %v", err)
		}
	}
}

func listJobsHandler(db *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		rows, err := db.Query(ctx, `
			SELECT
				id::text,
				name,
				COALESCE(description, ''),
				status,
				schedule_type,
				created_at,
				updated_at
			FROM jobs
			ORDER BY created_at DESC
		`)
		if err != nil {
			log.Printf("Failed to retrieve jobs: %v", err)
			http.Error(w, "Failed to retrieve jobs", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		jobs := make([]Job, 0)
		for rows.Next() {
			var job Job
			if err := rows.Scan(
				&job.ID,
				&job.Name,
				&job.Description,
				&job.Status,
				&job.ScheduleType,
				&job.CreatedAt,
				&job.UpdatedAt,
			); err != nil {
				log.Printf("Failed to scan job: %v", err)
				http.Error(w, "Failed to retrieve jobs", http.StatusInternalServerError)
				return
			}
			jobs = append(jobs, job)
		}

		if err := rows.Err(); err != nil {
			log.Printf("Error while reading jobs: %v", err)
			http.Error(w, "Failed to retrieve jobs", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(jobs); err != nil {
			log.Printf("Failed to encode jobs: %v", err)
		}
	}
}
