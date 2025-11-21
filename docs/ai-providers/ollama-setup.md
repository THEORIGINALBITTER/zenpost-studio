# Ollama Setup Guide

**Provider:** Ollama
**Type:** Local AI (Privacy-focused, Offline)
**Cost:** Free
**Requirements:** Local installation, ~8GB RAM minimum

---

## 📋 What is Ollama?

Ollama allows you to run large language models **locally** on your own computer. This means:
- ✅ **100% Privacy** - Your data never leaves your machine
- ✅ **No API costs** - Completely free to use
- ✅ **Offline capable** - Works without internet connection
- ✅ **Fast responses** - No network latency

---

## 🚀 Step 1: Install Ollama

### macOS

1. **Download Ollama**
   - Visit: [ollama.com](https://ollama.com)
   - Click "Download for macOS"
   - Or use Homebrew:
     ```bash
     brew install ollama
     ```

2. **Install the downloaded .dmg file**
   - Open the downloaded file
   - Drag Ollama to Applications folder
   - Open Ollama from Applications

3. **Verify Installation**
   ```bash
   ollama --version
   ```
   You should see output like: `ollama version is 0.x.x`

### Linux

1. **One-line install script**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Verify Installation**
   ```bash
   ollama --version
   ```

### Windows

1. **Download Ollama**
   - Visit: [ollama.com](https://ollama.com)
   - Click "Download for Windows"
   - Run the installer

2. **Verify Installation**
   ```bash
   ollama --version
   ```

---

## 🤖 Step 2: Download an AI Model

Ollama requires you to download at least one model. Here are the recommended models for ZenPost Studio:

### Recommended Models

| Model | Size | Best For | Download Command |
|-------|------|----------|------------------|
| **llama3.1** (Recommended) | ~4.7GB | General purpose, best quality | `ollama pull llama3.1` |
| **codellama** | ~3.8GB | Code conversion tasks | `ollama pull codellama` |
| **mistral** | ~4.1GB | Fast, efficient responses | `ollama pull mistral` |
| **qwen2.5-coder** | ~4.7GB | Advanced code understanding | `ollama pull qwen2.5-coder` |

### Download Your First Model

```bash
# Download Llama 3.1 (recommended)
ollama pull llama3.1
```

**What happens during download:**
- First run will download ~4-7GB (depending on model)
- Future runs use the cached model
- Models are stored in `~/.ollama/models`

**Example output:**
```
pulling manifest
pulling 8eeb52dfb3bb... 100% ▕████████████████▏ 4.7 GB
pulling 73b313b5552d... 100% ▕████████████████▏  11 KB
pulling 0ba8f0e314b4... 100% ▕████████████████▏  12 KB
pulling 56bb8bd477a5... 100% ▕████████████████▏  96 B
pulling 1a4c3c319823... 100% ▕████████████████▏ 485 B
verifying sha256 digest
writing manifest
removing any unused layers
success
```

---

## ⚙️ Step 3: Start Ollama Server

Ollama runs as a background server. You need to start it before using ZenPost Studio.

### Start the Server

```bash
ollama serve
```

**Expected output:**
```
Couldn't find '/Users/yourname/.ollama/id_ed25519'. Generating new private key.
Your new public key is: ssh-ed25519 AAAAC3Nza...

2024/11/17 10:30:00 routes.go:123: Listening on 127.0.0.1:11434 (version 0.x.x)
```

**Important:**
- Keep this terminal window **open** while using ZenPost Studio
- The server runs on `http://localhost:11434` by default
- Press `Ctrl+C` to stop the server

### Alternative: Run as Background Service

**macOS/Linux:**
```bash
# Start in background
ollama serve &

# Or use launchd (macOS)
brew services start ollama
```

**Windows:**
```bash
# Ollama runs as a Windows service automatically
# No need to manually start
```

---

## 🔧 Step 4: Configure ZenPost Studio

1. **Open ZenPost Studio**

2. **Navigate to Settings**
   - Open File Converter or Content Transform
   - Click the **Settings icon** (⚙️) in the bottom right corner

3. **Configure Ollama**
   - **AI Provider:** Select `Ollama`
   - **Base URL:** `http://localhost:11434` (default)
   - **Model:** Select your downloaded model (e.g., `llama3.1`)
   - **Temperature:** `0.3` (recommended for coding tasks)

4. **Click "Speichern" (Save)**

---

## ✅ Step 5: Test Your Setup

### Quick Test

1. Open **File Converter** in ZenPost Studio
2. Select format: `Code (AI)` → `Markdown`
3. Paste some code:
   ```python
   def hello():
       print("Hello World")
   ```
4. Click "Konvertieren" (Convert)
5. You should see AI-generated documentation!

### Troubleshooting Test

**Test if Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

**Expected response:**
```json
{
  "models": [
    {
      "name": "llama3.1:latest",
      "modified_at": "2024-11-17T10:30:00Z",
      "size": 4661229568
    }
  ]
}
```

---

## 🛠️ Common Issues & Solutions

### Issue 1: "Connection refused" or "Failed to connect"

**Problem:** Ollama server is not running

**Solution:**
```bash
# Check if Ollama is running
ps aux | grep ollama

# Start the server
ollama serve
```

---

### Issue 2: "Model not found"

**Problem:** You haven't downloaded the model yet

**Solution:**
```bash
# List downloaded models
ollama list

# Download the model
ollama pull llama3.1
```

---

### Issue 3: Slow responses / High CPU usage

**Problem:** Model is too large for your hardware

**Solution:** Use a smaller model
```bash
# Try a smaller model
ollama pull mistral  # ~4GB instead of 7GB
```

---

### Issue 4: Port 11434 already in use

**Problem:** Another process is using the port

**Solution:**
```bash
# Find what's using the port
lsof -i :11434

# Kill the process (replace PID with actual number)
kill -9 <PID>

# Or use a different port
ollama serve --port 11435
# Then update Base URL in ZenPost Studio to http://localhost:11435
```

---

### Issue 5: "Out of memory" errors

**Problem:** Not enough RAM for the model

**Solutions:**
1. **Close other applications** to free up RAM
2. **Use a smaller model:**
   ```bash
   ollama pull mistral  # Lighter than llama3.1
   ```
3. **Increase system swap space** (advanced)

---

## 📊 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **RAM** | 8GB | 16GB+ |
| **Storage** | 10GB free | 20GB+ free |
| **CPU** | 4 cores | 8 cores+ |
| **GPU** | Not required | NVIDIA GPU (CUDA) for faster inference |

---

## 🎯 Advanced: Using GPU Acceleration

If you have an NVIDIA GPU, Ollama will automatically use it for faster inference.

### Check GPU Usage

```bash
# macOS/Linux
watch -n 1 nvidia-smi

# You should see ollama using GPU memory
```

### Force CPU-only Mode

```bash
# If you want to use CPU only
OLLAMA_NO_CUDA=1 ollama serve
```

---

## 🔄 Updating Ollama

### Update Ollama Application

**macOS (Homebrew):**
```bash
brew upgrade ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
- Download latest installer from [ollama.com](https://ollama.com)
- Run installer (it will update existing installation)

### Update Models

```bash
# Re-pull model to get latest version
ollama pull llama3.1
```

---

## 📚 Useful Ollama Commands

```bash
# List all downloaded models
ollama list

# Remove a model to free up space
ollama rm codellama

# Show model details
ollama show llama3.1

# Run a model in interactive mode (for testing)
ollama run llama3.1

# Stop all running models
ollama stop llama3.1

# Check Ollama version
ollama --version
```

---

## 🔐 Privacy & Security

### Where is my data stored?

- **Models:** `~/.ollama/models` (macOS/Linux) or `C:\Users\<user>\.ollama\models` (Windows)
- **Logs:** `~/.ollama/logs`
- **Server runs locally:** `127.0.0.1:11434` (not accessible from internet)

### Does Ollama send data to the internet?

- ❌ **No** - All processing happens locally
- ❌ **No telemetry** - Your prompts never leave your computer
- ✅ **Only downloads models** from ollama.com (one-time)

---

## 🆘 Getting Help

**Ollama Documentation:** [https://github.com/ollama/ollama/tree/main/docs](https://github.com/ollama/ollama/tree/main/docs)

**Ollama Discord:** [https://discord.gg/ollama](https://discord.gg/ollama)

**ZenPost Studio Issues:** [GitHub Issues](https://github.com/theoriginalbitter/zenpost-studio/issues)

---

## 🎉 Next Steps

Now that Ollama is set up, you can:

1. ✅ **Use File Converter** - Convert code to documentation with AI
2. ✅ **Use Content Transform** - Transform Markdown into platform-specific posts
3. ✅ **Download more models** - Try different models for different tasks
   ```bash
   ollama pull codellama      # Best for code
   ollama pull mistral        # Fast and efficient
   ollama pull qwen2.5-coder  # Advanced code understanding
   ```

---

**Happy coding with local AI! 🚀**
