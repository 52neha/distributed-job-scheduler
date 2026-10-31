package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgxpool"
)

func createJobHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

		var request CreateJobRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			http.Error(w, "Invalid JSON request body", http.StatusBadRequest)
			return
		}

		request.Name = strings.TrimSpace(request.Name)
		request.Description = strings.TrimSpace(request.Description)

		if request.Name == "" {
			http.Error(w, "name is required", http.StatusBadRequest)
			return
		}
		if utf8.RuneCountInString(request.Name) > 150 {
			http.Error(w, "name must be 150 characters or fewer", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var job Job
		err := pool.QueryRow(ctx, `
			INSERT INTO jobs (name, description)
			VALUES ($1, NULLIF($2, ''))
			RETURNING
				id::text,
				name,
				COALESCE(description, ''),
				status,
				schedule_type,
				created_at,
				updated_at
		`, request.Name, request.Description).Scan(
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
			http.Error(w, "Could not create job", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		if err := json.NewEncoder(w).Encode(job); err != nil {
			log.Printf("Failed to encode created job: %v", err)
		}
	}
}
