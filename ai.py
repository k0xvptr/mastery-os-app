from pydantic_ai.models.google import GoogleModel
from dotenv import load_dotenv
from pydantic_ai import Agent
import tools
load_dotenv()
model = GoogleModel("gemini-3-flash-preview")

q_agent = Agent(model,
              system_prompt="generates a question based on data I give you (subject, uploaded files, JSON)",
              tools=[])
f_agent = Agent(model,
              system_prompt="given you data on what the user did bad, returnss feedback on how to improve",
              tools=[])

a_agent = Agent(model,
              system_prompt="given you the question, returns a solution with explanations",
              tools=[])


def question_agent(datas:str) -> str:
    #question_generation_agent
    user_input = str(datas)
    try:
        resp = q_agent.run_sync(user_input)
        return resp.output
    except Exception as e:
        return f"Error occurred: {e}"


def feedback_agent(datas:str) -> str:
    user_input = str(datas)
    try:
        resp = f_agent.run_sync(user_input)
        return resp.output
    except Exception as e:
        return f"Error occurred: {e}"


def solution_agent(datas:str) -> str:
    user_input = str(datas)
    try:
        resp = a_agent.run_sync(user_input)
        return resp.output
    except Exception as e:
        return f"Error occurred: {e}"


def generate_questions(data:str, amount:int) -> dict:
    """
    :param data: The text we are being questioned on
    :param amount: Number of questions to generate
    :return: Dictionary in form {question: answer}
    """
    output = {}
    for _ in range(amount):
        output[question_agent(data)] = solution_agent(data)

    return output