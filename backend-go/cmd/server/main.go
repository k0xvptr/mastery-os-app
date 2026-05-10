package main

import (
	"fmt"
	"github.com/k0xvptr/mastery-os-app/internal/engine"
	"net/http"
	"strconv"
)

func HandleSubject(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*");
	w.Header().Set("Content-Type", "application/json");

	query := r.URL.Query();
	subjectName := query.Get("subject");
	difficulty := query.Get("diff");
	if (subjectName != "ENG" && subjectName != "MATH" && subjectName != "SCI") {
		http.Error(w, "Invalid Subject", http.StatusNotFound);
	}
	diff_int, err := strconv.Atoi(difficulty);
	if (err != nil) {
		http.Error(w, "Difficulty could not be converted to integer", http.StatusBadRequest);
	}
	if (diff_int > 5 || diff_int < 0) {
		http.Error(w, "Invalid Difficulty Level", http.StatusNotFound);
	}
}

func NextCard(w http.ResponseWriter, r *http.Request) {
	
}

func main() {
	var myCard engine.Card;
	http.HandleFunc("/mini-game/subject", HandleSubject);
	http.HandleFunc("/cards/next", NextCard);
}
