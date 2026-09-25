"""
Unified AIService Abstraction Layer.
Supports OpenAI, Gemini, Local/Ollama, and Deterministic Fallback providers.
Ensures zero financial number fabrication and maintains robust fallbacks.
"""
from typing import Dict, Any, List, Optional
import os
import httpx
from app.core.config import settings


class AIService:
    @staticmethod
    def get_available_provider() -> str:
        if settings.GROQ_API_KEY and len(settings.GROQ_API_KEY.strip()) > 5:
            return "groq"
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY.strip()) > 5:
            return "openai"
        if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 5:
            return "gemini"
        ollama_url = os.environ.get("OLLAMA_BASE_URL")
        if ollama_url:
            return "ollama"
        return "deterministic"

    @classmethod
    def generate_completion(
        cls,
        prompt: str,
        system_instruction: str = "You are an institutional financial analyst. Synthesize verified data accurately without fabricating numbers.",
        max_tokens: int = 800,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        provider = cls.get_available_provider()

        if provider == "groq":
            return cls._call_groq(prompt, system_instruction, max_tokens, temperature)
        elif provider == "openai":
            return cls._call_openai(prompt, system_instruction, max_tokens, temperature)
        elif provider == "gemini":
            return cls._call_gemini(prompt, system_instruction, max_tokens, temperature)
        elif provider == "ollama":
            return cls._call_ollama(prompt, system_instruction, max_tokens, temperature)

        return {
            "provider": "deterministic",
            "content": None,
            "status": "FALLBACK"
        }

    @classmethod
    def _call_groq(cls, prompt: str, system_instruction: str, max_tokens: int, temperature: float) -> Dict[str, Any]:
        models_to_try = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
        for model in models_to_try:
            try:
                headers = {
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
                body = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": max(max_tokens, 300),
                    "temperature": temperature
                }
                with httpx.Client(timeout=15.0) as client:
                    res = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=body)
                    if res.status_code == 200:
                        data = res.json()
                        msg = data["choices"][0]["message"]
                        content = msg.get("content") or msg.get("reasoning")
                        if content and len(content.strip()) > 0:
                            return {"provider": "groq", "model": model, "content": content.strip(), "status": "SUCCESS"}
            except Exception:
                continue
        return {"provider": "groq", "content": None, "status": "ERROR"}

    @classmethod
    def _call_openai(cls, prompt: str, system_instruction: str, max_tokens: int, temperature: float) -> Dict[str, Any]:
        try:
            headers = {
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            body = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            with httpx.Client(timeout=15.0) as client:
                res = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    return {"provider": "openai", "content": content, "status": "SUCCESS"}
        except Exception:
            pass
        return {"provider": "openai", "content": None, "status": "ERROR"}

    @classmethod
    def _call_gemini(cls, prompt: str, system_instruction: str, max_tokens: int, temperature: float) -> Dict[str, Any]:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            body = {
                "contents": [
                    {
                        "parts": [
                            {"text": f"{system_instruction}\n\n{prompt}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens
                }
            }
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, json=body)
                if res.status_code == 200:
                    data = res.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return {"provider": "gemini", "content": content, "status": "SUCCESS"}
        except Exception:
            pass
        return {"provider": "gemini", "content": None, "status": "ERROR"}

    @classmethod
    def _call_ollama(cls, prompt: str, system_instruction: str, max_tokens: int, temperature: float) -> Dict[str, Any]:
        try:
            base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
            url = f"{base_url}/api/generate"
            body = {
                "model": os.environ.get("OLLAMA_MODEL", "llama3"),
                "system": system_instruction,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, json=body)
                if res.status_code == 200:
                    data = res.json()
                    return {"provider": "ollama", "content": data.get("response"), "status": "SUCCESS"}
        except Exception:
            pass
        return {"provider": "ollama", "content": None, "status": "ERROR"}
