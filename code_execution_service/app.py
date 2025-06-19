from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import tempfile
import os
import json
import signal
from contextlib import contextmanager
import traceback

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class TimeoutException(Exception):
    pass

@contextmanager
def time_limit(seconds):
    def signal_handler(signum, frame):
        raise TimeoutException("Timed out!")
    
    # Set the signal handler and a 5-second alarm
    signal.signal(signal.SIGALRM, signal_handler)
    signal.alarm(seconds)
    
    try:
        yield
    finally:
        # Disable the alarm
        signal.alarm(0)

def run_code_in_process(code: str, test_input: dict) -> dict:
    # Create a temporary file for the code
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        # Write the test wrapper
        f.write(f"""
import sys
import json
import numpy as np
import traceback

# User's code
{code}

try:
    # Get test input
    test_input = json.loads('{json.dumps(test_input)}')
    
    # Try to get the expected function name from the code
    # This allows for different function names in different problems
    function_name = None
    for line in {code.splitlines()}:
        if line.startswith('def '):
            function_name = line[4:line.index('(')]
            break
    
    if not function_name:
        raise ValueError("No function definition found in the code")
    
    # Get the function from globals
    solution_func = globals()[function_name]
    
    # Run the solution with the test input
    result = solution_func(test_input)
    
    # Convert numpy arrays to lists for JSON serialization
    if isinstance(result, np.ndarray):
        result = result.tolist()
    
    print(json.dumps({{"status": "success", "output": result}}))
except Exception as e:
    print(json.dumps({{"status": "error", "error": str(e), "traceback": traceback.format_exc()}}))
""")
        temp_file = f.name

    try:
        # Run the code in a separate process with a time limit
        with time_limit(5):  # 5 second timeout
            process = subprocess.Popen(
                ['python', temp_file],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate()

        # Parse the output
        try:
            result = json.loads(stdout)
            return {
                "status": result["status"],
                "output": result.get("output"),
                "error": result.get("error"),
                "traceback": result.get("traceback")
            }
        except json.JSONDecodeError:
            return {
                "status": "error",
                "error": "Invalid output format",
                "stdout": stdout,
                "stderr": stderr
            }

    except TimeoutException:
        return {
            "status": "error",
            "error": "Code execution timed out"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        # Clean up the temporary file
        try:
            os.unlink(temp_file)
        except:
            pass

def compare_outputs(user_output, expected_output):
    """Compare user output with expected output."""
    if isinstance(user_output, list) and isinstance(expected_output, list):
        return user_output == expected_output
    return user_output == expected_output

@app.route('/execute', methods=['POST'])
def execute_code():
    try:
        data = request.get_json()
        code = data.get('code')
        test_inputs = data.get('test_inputs', [])
        expected_outputs = data.get('expected_outputs', [])
        
        if not code or not test_inputs:
            return jsonify({
                'error': 'Missing code or test inputs'
            }), 400

        results = []
        all_passed = True

        for i, test_input in enumerate(test_inputs):
            # Run the code
            result = run_code_in_process(code, test_input)
            
            if result['status'] == 'error':
                results.append({
                    'input': test_input,
                    'error': result['error'],
                    'traceback': result.get('traceback'),
                    'is_correct': False
                })
                all_passed = False
            else:
                # Compare with expected output if available
                expected = expected_outputs[i] if i < len(expected_outputs) else None
                is_correct = compare_outputs(result['output'], expected) if expected is not None else True
                
                results.append({
                    'input': test_input,
                    'user_out': result['output'],
                    'ref_out': expected,
                    'is_correct': is_correct
                })
                if not is_correct:
                    all_passed = False

        response = {
            'results': results,
            'all_tests_passed': all_passed
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 