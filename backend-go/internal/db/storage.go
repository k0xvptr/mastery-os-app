package db;

import (
	"os"
	"errors"
	"io/fs"
	"encoding/json"
	"github.com/k0xvptr/mastery-os-app/internal/engine"
)

const Path = "/data/db.json";

func LoadState() engine.UserData {
	data, err := os.ReadFile(Path);	
	if (err != nil) {
		if errors.Is(err, fs.ErrNotExist) {
			os.Create("db.json");
		}
	}
	var UserData engine.UserData;
	json.Unmarshal(data, &UserData);
	return UserData;
}

func SaveState(UserData engine.UserData) {
	data, err := json.MarshalIndent(UserData, "", " ");
	if (err != nil) {

	}
	os.WriteFile(Path, data, 0644);
}
