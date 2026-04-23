"""
AERIS — Run All DL Models
Extracts code from all 5 DL notebooks and runs them sequentially.
Run with: dl_env/bin/python3 dl/run_all_dl_models.py
"""

import os, sys, json, time, traceback
import matplotlib
matplotlib.use("Agg")   # headless — no display needed

# Ensure we're in the dl/ directory so read_csv('bihar_flood_data.csv') works
os.chdir(os.path.dirname(os.path.abspath(__file__)))

NOTEBOOKS = [
    "DL_ANN_MODEL.ipynb",
    "DL_CNN_MODEL.ipynb",
    "DL_LSTM_MODEL.ipynb",
    "DL_AUTOENCODER_MODEL.ipynb",
    "DL_TABNET_MODEL.ipynb",
]

def extract_code(nb_path: str) -> str:
    with open(nb_path) as f:
        nb = json.load(f)
    lines = []
    for cell in nb["cells"]:
        if cell["cell_type"] == "code":
            src = "".join(cell["source"])
            # Replace plt.show() with save + close (headless)
            src = src.replace("plt.show()", 'plt.savefig("plot_output.png"); plt.close()')
            lines.append(src)
    return "\n\n".join(lines)

results = {}

for nb_name in NOTEBOOKS:
    model_name = nb_name.replace("DL_", "").replace("_MODEL.ipynb", "")
    print(f"\n{'='*55}")
    print(f"  Running: {model_name}")
    print(f"{'='*55}")
    t0 = time.time()
    try:
        code = extract_code(nb_name)
        exec_globals = {"__name__": "__main__"}
        exec(compile(code, nb_name, "exec"), exec_globals)
        elapsed = round(time.time() - t0, 1)
        print(f"\n✅ {model_name} completed in {elapsed}s")
        results[model_name] = "✅ PASS"
    except Exception as e:
        elapsed = round(time.time() - t0, 1)
        print(f"\n❌ {model_name} FAILED after {elapsed}s: {e}")
        traceback.print_exc()
        results[model_name] = f"❌ FAIL — {e}"

print(f"\n\n{'='*55}")
print("  AERIS DL Models — Final Report")
print(f"{'='*55}")
for model, status in results.items():
    print(f"  {model:<20} {status}")
print()
