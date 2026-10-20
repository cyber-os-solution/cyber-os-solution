# ADR-001 — Meta WhatsApp Cloud API como canal único

**Status:** Aceita em 19/10/2026

## Decisão

Usar exclusivamente a Meta WhatsApp Cloud API. Integrações por QR Code, incluindo UAZAPI, Evolution e Z-API, não fazem parte da plataforma.

## Consequências

Webhooks devem ter assinatura verificada, mensagens ativas usam templates aprovados e o canal fica encapsulado em `@cyber/messaging`.
