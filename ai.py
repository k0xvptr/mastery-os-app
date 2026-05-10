import requests
from flask import Flask, request, jsonify
from pydantic_ai.models.google import GoogleModel
from dotenv import load_dotenv
from pydantic_ai import Agent

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


def generate_questions(data: str, amount: int) -> dict:
    output = {}
    for _ in range(amount):
        # Using your existing logic to pair a question with a solution
        q = question_agent(data)
        s = solution_agent(data)
        output[q] = s
    return output


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


# 5. START THE SERVER ON PORT 8080
if __name__ == '__main__':
    # '0.0.0.0' allows other computers on the network to find you
    app.run(host='0.0.0.0', port=8080)

app = Flask(__name__)


@app.route('/my-endpoint', methods=['POST'])
def handle_post():
    # .get_json() automatically converts the incoming JSON into a Python Dictionary
    data = request.get_json()

    print(f"Received dictionary: {data}")
    print(f"Accessing a key: {data.get('name')}")

    return jsonify({"status": "success", "message": "I got it!"}), 200


if __name__ == '__main__':
    app.run(port=8080)