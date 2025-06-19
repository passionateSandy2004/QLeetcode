import http.client
import json
import time
import base64
from typing import List

def generate_judge0_script(user_code: str, test_inputs: List, expected_outputs: List):
    """
    Wrap user code with a test harness that runs all test cases and prints results as JSON.
    """
    # Prepare test cases as a list of dicts
    test_cases = [
        {"input": inp, "expected": out}
        for inp, out in zip(test_inputs, expected_outputs)
    ]
    # The harness will call the user's solution for each input
    harness = f'''
import json
import sys

def run_tests():
    test_cases = {json.dumps(test_cases)}
    results = []
    for case in test_cases:
        try:
            output = solution(*case["input"]) if isinstance(case["input"], (list, tuple)) else solution(case["input"])
            is_correct = output == case["expected"]
            results.append({{"input": case["input"], "user_out": output, "ref_out": case["expected"], "is_correct": is_correct}})
        except Exception as e:
            results.append({{"input": case["input"], "error": str(e), "is_correct": False}})
    print(json.dumps(results))

{user_code}

if __name__ == "__main__":
    run_tests()
'''
    return harness

RAPIDAPI_KEY = "aab534825amsh940f9cb13cfaf23p1aa15bjsne736af2cdbf3"
HOST         = "judge0-ce.p.rapidapi.com"

def submit_code(source_code: str, lang_id: int = 71) -> str:
    """Submit code to Judge0 and return submission token."""
    conn = http.client.HTTPSConnection(HOST)
    payload = {
        "language_id": lang_id,
        "source_code": base64.b64encode(source_code.encode()).decode(),
        "stdin":       base64.b64encode(b"").decode()
    }
    headers = {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": HOST,
        "Content-Type":    "application/json"
    }
    conn.request(
        "POST",
        "/submissions?base64_encoded=true&wait=false&fields=token",
        json.dumps(payload),
        headers
    )
    res  = conn.getresponse()
    data = json.loads(res.read())
    return data["token"]

def fetch_result(token: str) -> dict:
    """Poll Judge0 until execution is finished, then return decoded result."""
    conn = http.client.HTTPSConnection(HOST)
    headers = {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": HOST,
    }

    while True:
        conn.request(
            "GET",
            f"/submissions/{token}?base64_encoded=true&fields=stdout,stderr,compile_output,status",
            headers=headers
        )
        res  = conn.getresponse()
        data = json.loads(res.read())
        status_id = data["status"]["id"]
        if status_id > 2:   # 1 = in queue, 2 = processing
            # decode safely, default to empty string if None
            stdout         = base64.b64decode(data.get("stdout") or "").decode()
            stderr         = base64.b64decode(data.get("stderr") or "").decode()
            compile_output = base64.b64decode(data.get("compile_output") or "").decode()
            return {
                "status":         data["status"]["description"],
                "stdout":         stdout,
                "stderr":         stderr,
                "compile_output": compile_output
            }
        time.sleep(0.5)

# Example usage:
if __name__ == "__main__":
    user_code = '''
def solution(x):
    return x * 2
'''
    test_inputs = [2, 5]
    expected_outputs = [4, 10]
    script = generate_judge0_script(user_code, test_inputs, expected_outputs)
    token  = submit_code(script, lang_id=71)
    print("Submitted, token =", token)
    result = fetch_result(token)
    print("Result:", result)
