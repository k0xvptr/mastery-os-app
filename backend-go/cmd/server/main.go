package main

import (
	"bytes"
	"github.com/k0xvptr/mastery-os-app/internal/engine"
	"net/http"
	"encoding/json"
	"github.com/k0xvptr/mastery-os-app/internal/db"
	"github.com/google/uuid"
)

func HandleSubject(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*");
	w.Header().Set("Content-Type", "application/json");

	query := r.URL.Query();
	subjectName := query.Get("subject");
	if (subjectName != "ENG" && subjectName != "MATH" && subjectName != "SCI") {
		http.Error(w, "Invalid Subject", http.StatusNotFound);
	} else {
		url := "http://localhost:8080/generate";
		data := map[string]string{ "subject": subjectName, "amount" : "Generate 5 Cards" };

		jsonData, _ := json.Marshal(data);
		
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData));
		if (err != nil) {
			http.Error(w, "AI Service Down", http.StatusInternalServerError);
		}
		defer resp.Body.Close();

		var newCards []engine.Card;
		if err := json.NewDecoder(resp.Body).Decode(&newCards); err != nil {
			http.Error(w, "Failed to process AI response", http.StatusInternalServerError);
			return;
		}

		for i := range newCards {
			newCards[i].ID = uuid.New().String();
		}

		state := db.LoadState();
		state.Cards = append(state.Cards, newCards...);
		db.SaveState(state);

		json.NewEncoder(w).Encode(newCards);
	}	
}

func HandleFinishGame(w http.ResponseWriter, r *http.Request) {
	var submission engine.GameSubmission;

	err := json.NewDecoder(r.Body).Decode(&submission);
	if (err != nil) {
		http.Error(w, "Failed to process user response", http.StatusInternalServerError);
		return;
	}

	state := db.LoadState();
	var dataforAI []engine.Comparison;
	for i, id := range submission.CardIDs {
		userAnswer := submission.UserAnswers[i];

		var targetCard engine.Card;
		found := false;

		for _, card := range state.Cards {
			if (card.ID == id) {
				targetCard = card;
				found = true;
				break;
			}
		}

		dataforAI = append(dataforAI, engine.Comparison{
			UserAnswer : userAnswer,
			CorrectAnswer: targetCard.Answer,
		})

		if !found {
			http.Error(w, "Card Not Found in DB", http.StatusInternalServerError);
			return;
		}
	}

	aiPayload, _ := json.Marshal(dataforAI);
	resp, err := http.Post("", "application/json", bytes.NewBuffer(aiPayload));
	
	if err != nil {
		return;
	}
	defer resp.Body.Close()

	var grades []engine.AIResp;
	if err := json.NewDecoder(resp.Body).Decode(&grades); err != nil {
		http.Error(w, "Failed to decode AI grades", http.StatusInternalServerError)
		return;
	}
}

func HandleFeedBackPage(w http.ResponseWriter, r *http.Request) {
		
}

func main() {
	http.HandleFunc("/mini-game/subject", HandleSubject);
	http.HandleFunc("/analytics", HandleFeedBackPage);
	http.HandleFunc("/mini-game/finished", HandleFinishGame);

	port := ":8081";
	http.ListenAndServe(port, nil);
}
