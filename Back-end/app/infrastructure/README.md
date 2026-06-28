# External services/integrations

infrastructure/
├── redis/
├── rabbitmq/
├── email/
├── storage/
├── websocket/
├── monitoring/
├── cache/
├── ai/
└── external_apis/

## Example Structure

infrastructure/
├── redis/
│   ├── client.py
│   ├── cache_service.py
│   └── pubsub.py
│
├── rabbitmq/
│   ├── connection.py
│   ├── producer.py
│   └── consumer.py
│
├── email/
│   ├── smtp_service.py
│   ├── templates/
│   └── mailer.py