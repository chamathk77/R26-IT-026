# Run Analysis Backend on Google Colab (step by step)

Colab runs **Python** in the cloud. This guide uses your **`Analysis_Backend`** (sales/cost forecast API).  
Your **Expo app** and **MongoDB Node backend** still run on your computer (or Atlas); Colab is for training + optional short-lived forecast API.

---

## Step 1 — Open Google Colab

1. Go to **https://colab.research.google.com**
2. Sign in with your Google account.
3. Click **File → New notebook**.

---

## Step 2 — (Optional) Turn on GPU

1. Menu **Runtime → Change runtime type**
2. **Hardware accelerator:** T4 GPU or CPU (either works for this project).
3. Click **Save**.

---

## Step 3 — Put the project on Colab (pick one way)

### Option A — Clone from GitHub (easiest if repo is public)

Run this in **one code cell**:

```python
!git clone https://github.com/YOUR_USERNAME/R26-IT-026.git
%cd R26-IT-026/Analysis_Backend
!ls
```

Replace `YOUR_USERNAME/R26-IT-026` with your real GitHub path.

### Option B — Upload a ZIP from your PC

1. On your PC, zip the folder **`Analysis_Backend`** only (must contain `app/`, `data/`, `requirements.txt`, `train_model.py`).
2. In Colab, run:

```python
from google.colab import files
uploaded = files.upload()   # pick your ZIP
```

```python
!unzip -o Analysis_Backend.zip -d /content/
%cd /content/Analysis_Backend
!ls
```

(Adjust ZIP name if different.)

---

## Step 4 — Check the CSV

Your training file should be:

`data/monthly_performance.csv`

with columns: **`month`**, **`sales`**, **`cost`** (e.g. month `2000-01`).

**If the CSV is missing**, upload it:

```python
from google.colab import files
%cd /content/R26-IT-026/Analysis_Backend   # or your path after Step 3
!mkdir -p data
files.upload()  # select monthly_performance.csv, then move it:
```

After upload, if the file landed in `/content/`, move it:

```python
!mv /content/monthly_performance.csv data/monthly_performance.csv
!head -5 data/monthly_performance.csv
```

---

## Step 5 — Install Python packages

New cell:

```python
%cd /content/R26-IT-026/Analysis_Backend   # fix path if you used Option B
!pip install -q -r requirements.txt
```

---

## Step 6 — Train the model

```python
!python train_model.py
```

You should see JSON with `metrics` and `model_path`.  
This creates **`models/business_forecaster.joblib`**.

---

## Step 7 — Download the model to your PC

```python
from google.colab import files
files.download('models/business_forecaster.joblib')
```

Put the downloaded file in your project:

`Analysis_Backend/models/business_forecaster.joblib`

Then on your PC run:

```bash
cd Analysis_Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000/docs** to test the API.

---

## Step 8 — (Optional) Try one forecast in Colab (no server)

New cell:

```python
from app.forecaster import predict_next_month_from_csv
from pathlib import Path
import json

csv_path = Path("data/monthly_performance.csv")
model_path = Path("models/business_forecaster.joblib")
print(json.dumps(predict_next_month_from_csv(csv_path, model_path), indent=2))
```

---

## Step 9 — (Optional) Run the FastAPI server with a public link

**Note:** The link stops when Colab disconnects.

```python
!pip install -q pyngrok
```

```python
from pyngrok import ngrok
import threading
import uvicorn
import os

# Optional: Colab secrets — add NGROK_AUTHTOKEN in the key icon (Secrets)
try:
    from google.colab import userdata
    token = userdata.get("NGROK_AUTHTOKEN")
    if token:
        !ngrok config add-authtoken {token}
except Exception:
    pass

public = ngrok.connect(8000)
print("Public URL:", public.public_url)

def run():
    os.chdir("/content/R26-IT-026/Analysis_Backend")  # fix path if needed
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)

threading.Thread(target=run, daemon=True).start()
```

Open the printed URL + **`/docs`** (e.g. `https://xxxx.ngrok-free.app/docs`).

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| `ModuleNotFoundError: app` | Run `%cd` into `Analysis_Backend` before `train_model.py` or use `!cd Analysis_Backend && python train_model.py`. |
| `CSV must have columns` | Fix `data/monthly_performance.csv` headers. |
| `Need at least ~24 rows` | CSV too short after building lags; add more months. |
| ngrok warning / tunnel closed | Add free authtoken from ngrok.com; Colab session may have ended — reconnect. |

---

## What does NOT run in Colab (use your PC)

- **Expo / React Native** (`fontend`): run `npx expo start` locally.
- **Node + MongoDB** (`backend`): run locally with MongoDB Atlas, or deploy separately.

This notebook path trains the forecaster and, if you want, exposes the Python API for demos.
