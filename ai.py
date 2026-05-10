import requests
from flask import Flask, request, jsonify
from pydantic_ai.models.google import GoogleModel
from dotenv import load_dotenv
from pydantic_ai import Agent
from pydantic import BaseModel

# 1. SETUP & AGENT INITIALIZATION
load_dotenv()
model = GoogleModel("gemini-3-flash-preview")

app = Flask(__name__)

q_agent = Agent(model,
                system_prompt="generates a question based on data I give you (subject, uploaded files, JSON)",
                tools=[])
f_agent = Agent(model,
                system_prompt="given you data on what the user did bad, returnss feedback on how to improve",
                tools=[])
a_agent = Agent(model,
                system_prompt="given you the question, returns a solution with explanations",
                tools=[])

g_agent = Agent(model, system_prompt="Answer the question precisely and very understandable", tools=[])

class Evaluation(BaseModel):
    score: int
    feedback: str

verify_agent = Agent(
    model,
    result_type=Evaluation, # This forces the AI to return JSON matching the class
    system_prompt="Rate the user's answer from 0 to 5 and explain why."
)

def verify(user_answer, answer):
    resp = verify_agent.run_sync(f"User answer: {user_answer}. Original Answer: {answer}")
    return resp.data  # This is now a Python object with .score and .feedback

# 2. YOUR LOGIC FUNCTIONS
def question_agent(datas: str) -> str:
    try:
        resp = q_agent.run_sync(str(datas))
        return resp.output
    except Exception as e:
        return f"Error: {e}"


def solution_agent(datas: str) -> str:
    try:
        resp = a_agent.run_sync(str(datas))
        return resp.output
    except Exception as e:
        return f"Error: {e}"


def generate_questions(data: str, amount: int) -> list[dict]:
    output = []
    for _ in range(amount):
        # Using your existing logic to pair a question with a solution
        q = question_agent(data)
        s = solution_agent(data)
        output.append({"question": q, "answer": s})
    return output

def general_questions(data : str):
    try:
        resp = g_agent.run_sync(str(data))
        return resp.output
    except Exception as e:
        return f"Error: {e}"

# 3. THE FLASK ENDPOINT (The "Receiver")
@app.route('/generate', methods=['POST'])
def receive_from_kingsley():
    # This turns the incoming JSON directly into a Python Dict
    incoming_data = request.get_json()

    # Extracting the 'prompt' and 'subject' sent by Kingsley
    # If they don't send an 'amount', we default to 1
    prompt_text = incoming_data.get('prompt', '')
    count = incoming_data.get('amount', 1)

    # Process using your agents
    final_result = generate_questions(prompt_text, count)

    # 4. SEND DATA BACK (The "Response")
    # This sends the {question: answer} dict back to Kingsley immediately
    return jsonify(final_result), 200

@app.route('/mini-game/submit', methods=['POST'])
def handle_submit():
    data = request.get_json()
    final = []
    for item in data:
        eval_result = verify(item['user_answer'], item['correct_answer'])
        final.append({"score": eval_result.score, "feedback": eval_result.feedback})
    return jsonify(final)

@app.route('/prompt', methods=['POST'])
def tutorprompt():
    data = request.get_json()
    return general_questions(data)


# 5. START THE SERVER ON PORT 8080
if __name__ == '__main__':
    # '0.0.0.0' allows other computers on the network to find you
    app.run(host='0.0.0.0', port=8080)
