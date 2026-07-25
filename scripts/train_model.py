import os
import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression

# Create a deterministic mock training dataset
# A 5-reading window with (fire_raw, gas_raw, water_raw, pir_raw) -> 20 features
print("Generating 1000 sequences of dummy data...")
X = []
y = []

# Generate safe sequences
for _ in range(800):
    # random noise around normal
    seq = np.random.normal(loc=[0, 100, 100, 0], scale=[0.1, 10, 10, 0.1], size=(5, 4)).flatten()
    X.append(seq)
    y.append(0)

# Generate critical-bound sequences
for _ in range(200):
    # escalating gas and fire
    seq = np.random.normal(loc=[0.5, 250, 100, 1], scale=[0.1, 10, 10, 0.1], size=(5, 4)).flatten()
    X.append(seq)
    y.append(1)

X = np.array(X)
y = np.array(y)

print("Training Logistic Regression Model...")
model = LogisticRegression(max_iter=1000)
model.fit(X, y)

accuracy = model.score(X, y)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

model_path = os.path.join(os.path.dirname(__file__), '../backend/app/model.pkl')
joblib.dump(model, model_path)
print(f"Model saved to {model_path}")
