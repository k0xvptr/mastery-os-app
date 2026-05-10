package db;

import (
	"os"
	"errors"
	"io/fs"
	"encoding/json"
	"github.com/k0xvptr/mastery-os-app/internal/engine"
)

const Path = "data/db.json";

func LoadState() engine.UserData {
	data, err := os.ReadFile(Path);	
	if (err != nil) {
		if errors.Is(err, fs.ErrNotExist) {
			return engine.UserData {
				Cards: []engine.Card{},
				Attempts: []engine.Attempt{},
			}
		}
	}
	var UserData engine.UserData;
	err = json.Unmarshal(data, &UserData);
	if (err != nil) {
		return engine.UserData{};
	}
	return UserData;
}

func SaveState(UserData engine.UserData) {
	data, err := json.MarshalIndent(UserData, "", " ");
	if (err != nil) {

	}
	os.WriteFile(Path, data, 0644);
}
