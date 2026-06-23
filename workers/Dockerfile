FROM python:3.12-slim

WORKDIR /app

COPY workers/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY workers /app/workers

ENV PYTHONPATH=/app
EXPOSE 8000

CMD ["uvicorn", "workers.scanner_worker.main:app", "--host", "0.0.0.0", "--port", "8000"]
