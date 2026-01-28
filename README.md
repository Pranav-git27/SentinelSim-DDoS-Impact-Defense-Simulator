# Sentinel-X | DDoS Impact & Defense Simulator

![Sentinel-X Security Dashboard](https://img.shields.io/badge/Security-SOC-cyan?style=for-the-badge)
![Educational Simulation](https://img.shields.io/badge/Purpose-Educational-emerald?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-Gemini%203-indigo?style=for-the-badge)

Sentinel-X is a high-fidelity, interactive cybersecurity simulation dashboard designed for researchers and students. It provides a safe, synthetic environment to visualize the mechanics of Distributed Denial of Service (DDoS) attacks and the efficacy of modern mitigation strategies.

**⚠️ DISCLAIMER: This is a simulation tool. It DOES NOT generate real network traffic, executable attack code, or provide instructions for malicious activity. All data is synthetic and modeled logically for educational purposes.**

## 🛡️ Core Features

### 1. Synthetic Traffic Simulation
- **Dynamic Modeling**: Simulates legitimate baseline traffic vs. malicious surges across multiple vectors (Volumetric, Application, Resource, Protocol).
- **Advanced Simulation Engine**: Uses a **Target-Drift Algorithm** for metrics. CPU, Memory, and Latency don't just "jump" to values; they logically gravitate toward a state calculated based on current RPS, attack intensity, and active mitigations.

### 2. Tactical Defense Suite
- **Mitigation Controls**: Real-time deployment of WAF, CDN Absorption, Rate Limiting, CAPTCHA, Load Balancing, and IP Reputation Filtering.
- **Dynamic Resource Feedback**: Defenses like WAF provide protection but introduce CPU overhead, while CDN Absorption significantly reduces origin stress.

### 3. Interactive Encyclopedia
- **Cybersecurity Knowledge Base**: Integrated documentation for all attack types and defenses.
- **Theory to Practice**: Allows users to trigger simulations directly from intelligence reports to observe specific diagnostic symptoms.

### 4. AI-Powered Forensic Audit
- **SentinelAI Integration**: Powered by **Google Gemini 3 Pro**.
- **Deep Analysis**: Analyzes historical metric trends to provide risk scores, forensic threat descriptions, and tactical remediation steps.

### 5. Tactical Missions (Gamified Learning)
- **Scenario-Based Challenges**: Timed missions that require specific mitigation combinations to maintain system stability.
- **Victory Conditions**: Balance "System Efficiency" (legitimate user access) against "Threat Suppression."

## 🚀 Technical Architecture

- **Engine**: React 19 Functional Architecture with a centralized State Simulation Loop.
- **Styling**: Tailwind CSS (Cyber-grid / Dark-mode theme).
- **Metrics**: Recharts for real-time analytics visualization.
- **AI**: Google GenAI SDK (@google/genai) utilizing structured JSON output schemas.
- **Infrastructure**: Zero-build ESM deployment (served via CDN imports for maximum portability).

## 📂 Project Structure

- `App.tsx`: Central simulation loop and UI rendering.
- `types.ts`: Strictly typed interfaces for security metrics and state.
- `services/geminiService.ts`: AI-Forensic connector logic.
- `index.html`: Optimized viewport and dependency import map.

## 🛠️ Getting Started

1. **Environment**: Ensure you have a valid Google Gemini API Key.
2. **Setup**: The application expects the key to be provided via the `process.env.API_KEY` variable.
3. **Execution**: Serve the root directory via any modern web server (Vite, Live Server, etc.).

---
*Built for the next generation of cybersecurity defenders.*