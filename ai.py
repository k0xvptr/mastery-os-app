import uuid
from flask import Flask, request, jsonify
from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from dotenv import load_dotenv

load_dotenv()
model = GoogleModel("gemini-3-flash-preview")
app = Flask(__name__)


# --- 1. DEFINE THE STRUCTURE ---

class QAPair(BaseModel):
    """Schema for a single question and its corresponding answer."""
    question: str
    answer: str


class QAList(BaseModel):
    """Schema for a list of QA pairs."""
    questions: list[QAPair]


class Evaluation(BaseModel):
    score: int
    feedback: str


# --- 2. INITIALIZE AGENTS ---

# Unified generator agent
generator_agent = Agent(
    model,
    result_type=QAList,
    system_prompt=(
        "You are an educational assistant. Based on the provided subject or data, "
        "generate the requested number of high-quality questions and their "
        "corresponding detailed solutions/explanations."
    )
)

verify_agent = Agent(
    model,
    result_type=Evaluation,
    system_prompt="Rate the user's answer from 0 to 5 and explain why."
)

g_agent = Agent(model, system_prompt="Answer the question precisely and make it very understandable.")


# --- 3. LOGIC FUNCTIONS ---

def generate_questions_logic(data: str, amount: int) -> list[dict]:
    try:
        # One single call to the LLM to get 'amount' of Q&A pairs
        resp = generator_agent.run_sync(f"Generate {amount} questions about: {data}")

        # Format the output to include the UUIDs your frontend expects
        output = []
        for item in resp.data.questions:
            output.append({
                "id": str(uuid.uuid4()),
                "question": item.question,
                "answer": item.answer
            })
        return output
    except Exception as e:
        print(f"Error generating questions: {e}")
        return []


# --- 4. ENDPOINTS ---

@app.route('/generate', methods=['POST'])
def receive_from_kingsley():
    incoming_data = request.get_json()
    prompt_text = incoming_data.get("subject", 'General Knowledge')
    count = int(incoming_data.get("amount", 1))

    final_result = generate_questions_logic(prompt_text, count)
    return jsonify(final_result)


@app.route('/mini-game/submit', methods=['POST'])
def handle_submit():
    data = request.get_json()
    final = []
    for item in data:
        resp = verify_agent.run_sync(
            f"User answer: {item['user_answer']}. Original Answer: {item['correct_answer']}"
        )
        final.append({"score": resp.data.score, "feedback": resp.data.feedback})
    return jsonify(final)


@app.route('/prompt', methods=['POST'])
def tutorprompt():
    data = request.get_json()
    resp = g_agent.run_sync(str(data))
    return resp.data


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)