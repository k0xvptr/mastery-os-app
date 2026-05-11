// Package engine
package engine;

type Card struct {
	ID string `json:"id"`;
	Question string `json:"question"`; 
	Answer string `json:"answer"`;
}

type Attempt struct {
	// Reference to Card
	CardID string `json:"card_id"`;

	// Faliure Analysis Data
	UserResponse string `json:"user_response"`;
	Quality int `json:"quality"`;
	Timestamp int64 `json:"timestamp"`;
	ResponseTime int `json:"response_time"`;
	AIResponse string `json:"ai_response"`;
}

type UserData struct {
	Cards []Card `json:"cards"`;
	Attempts []Attempt `json:"attempts"`;
}

type GameSubmission struct {
	CardIDs []string `json:"card_ids"`;
	UserAnswers []string `json:"user_answers"`;
}

type Comparison struct {
	UserAnswer string `json:"user_answer"`;
	CorrectAnswer string `json:"correct_answer"`;
}

type AIResp struct {
	Score int `json:"score"`;
	Feedback string `json:"feedback"`;
}
