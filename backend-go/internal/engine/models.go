package engine;

type Card struct {
	ID string `json:"id"`; // Unique Identifier for card
	Question string `json:"question"`; 
	Answer string `json:"answer"`;
	
	// Concept of the card (helps organization and faliure analysis page)
	Concept string `json:"concept"`; 	
	Subject string `json:"subject"`;
	
	// Data for SM-2 Algorithm
	Interval int `json:"interval"`; // Frequency of Review
	EaseFactor float64 `json:"ease_factor"`; // Difficulty of Card
	NextReview string `json:"next_review"`; // Date for next review
}

type Attempt struct {
	// Reference to Card
	CardID string `json:"card_id"`;

	// Faliure Analysis Data
	UserResponse string `json:"user_response"`;
	Quality int `json:"quality"`;
	Timestamp string `json:"timestamp"`;
	ResponseTime int `json:"response_time"`;
}

type UserData struct {
	Cards []Card `json:"cards"`;
	Attempts []Attempt `json:"attempts"`;
}
