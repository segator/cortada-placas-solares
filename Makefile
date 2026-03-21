.PHONY: help install dev prod local up-local down-local logs shell run clean

# Colors - usando printf en lugar de echo para mejor compatibilidad
BLUE   := \e[1;34m
GREEN  := \e[1;32m
YELLOW := \e[1;33m
RED    := \e[1;31m
NC     := \e[0m

help:
	@printf "\n$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n"
	@printf "$(BLUE)  Placas Solares - Makefile de Desarrollo$(NC)\n"
	@printf "$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n\n"
	@printf "$(GREEN)DESARROLLO LOCAL:$(NC)\n"
	@printf "  $(YELLOW)make local$(NC)              - Instala deps y arranca uvicorn con --reload\n"
	@printf "  $(YELLOW)make install$(NC)            - Crea venv e instala requirements.txt\n"
	@printf "  $(YELLOW)make clean$(NC)              - Borra .venv, __pycache__, archivos .pyc\n"
	@printf "\n$(GREEN)RAILWAY (con CLI):$(NC)\n"
	@printf "  $(YELLOW)make dev-up$(NC)             - Levanta servicios locales (railway dev up)\n"
	@printf "  $(YELLOW)make dev-down$(NC)           - Para servicios locales (railway dev down)\n"
	@printf "  $(YELLOW)make dev-clean$(NC)          - Limpia y para servicios (railway dev clean)\n"
	@printf "\n$(GREEN)DESPLEGAR:$(NC)\n"
	@printf "  $(YELLOW)make deploy-dev$(NC)         - Deploy a ambiente dev\n"
	@printf "  $(YELLOW)make deploy-prod$(NC)        - Deploy a ambiente production\n"
	@printf "  $(YELLOW)make deploy$(NC)             - Deploy (alias para deploy-prod)\n"
	@printf "\n$(GREEN)MONITOREO:$(NC)\n"
	@printf "  $(YELLOW)make logs$(NC)               - Ver logs de último deployment\n"
	@printf "  $(YELLOW)make shell$(NC)              - Abre shell con vars de Railway\n"
	@printf "  $(YELLOW)make status$(NC)             - Estado del proyecto en Railway\n"
	@printf "\n$(GREEN)DESARROLLO:$(NC)\n"
	@printf "  $(YELLOW)make run CMD=\"<comando>\"$(NC) - Ejecuta comando con vars de Railway\n\n"

# ──────────────────────────────────────────────────────────────
# LOCAL DEVELOPMENT
# ──────────────────────────────────────────────────────────────

install:
	@printf "$(BLUE)→ Creando virtual environment...$(NC)\n"
	python3 -m venv .venv
	@printf "$(BLUE)→ Activando venv e instalando dependencias...$(NC)\n"
	. .venv/bin/activate && pip install -r requirements.txt
	@printf "$(GREEN)✓ Instalación completada$(NC)\n\n"
	@printf "$(YELLOW)Próximo paso:$(NC) make local\n"

local: .venv
	@printf "\n$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n"
	@printf "$(BLUE)  Arrancando Placas Solares (desarrollo local)$(NC)\n"
	@printf "$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n"
	@printf "$(GREEN)URL:$(NC) http://localhost:8000\n"
	@printf "$(GREEN)API:$(NC) http://localhost:8000/api/scenario\n"
	@printf "$(YELLOW)Press Ctrl+C to stop$(NC)\n\n"
	. .venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000

.venv:
	@printf "$(RED)✗ Virtual environment no encontrado$(NC)\n"
	@printf "$(YELLOW)Ejecuta:$(NC) make install\n"
	@exit 1

clean:
	@printf "$(BLUE)→ Limpiando archivos...$(NC)\n"
	rm -rf .venv
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@printf "$(GREEN)✓ Limpieza completada$(NC)\n"

# ──────────────────────────────────────────────────────────────
# RAILWAY LOCAL DEVELOPMENT (docker-compose)
# ──────────────────────────────────────────────────────────────

dev-up:
	@printf "\n$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n"
	@printf "$(BLUE)  Railway Dev - Levantando servicios locales$(NC)\n"
	@printf "$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n\n"
	railway dev up

dev-down:
	@printf "$(BLUE)→ Parando servicios locales...$(NC)\n"
	railway dev down
	@printf "$(GREEN)✓ Servicios detenidos$(NC)\n"

dev-clean:
	@printf "$(BLUE)→ Limpiando servicios locales (borrando volúmenes)...$(NC)\n"
	railway dev clean
	@printf "$(GREEN)✓ Limpieza completada$(NC)\n"

# ──────────────────────────────────────────────────────────────
# RAILWAY DEPLOY
# ──────────────────────────────────────────────────────────────

deploy-dev:
	@printf "\n$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n"
	@printf "$(BLUE)  Desplegando a DEVELOPMENT$(NC)\n"
	@printf "$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n\n"
	railway up --environment dev
	@printf "$(GREEN)✓ Deploy a dev completado$(NC)\n"

deploy-prod:
	@printf "\n$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n"
	@printf "$(BLUE)  Desplegando a PRODUCTION$(NC)\n"
	@printf "$(BLUE)════════════════════════════════════════════════════════════════$(NC)\n\n"
	railway up --environment production
	@printf "$(GREEN)✓ Deploy a production completado$(NC)\n"

deploy: deploy-prod

# ──────────────────────────────────────────────────────────────
# MONITORING & DEBUGGING
# ──────────────────────────────────────────────────────────────

logs:
	@printf "$(BLUE)→ Mostrando logs...$(NC)\n"
	railway logs -f

shell:
	@printf "$(BLUE)→ Abriendo shell con variables de Railway...$(NC)\n"
	railway shell

status:
	@printf "$(BLUE)→ Estado del proyecto...$(NC)\n"
	railway status

run:
	@if [ -z "$(CMD)" ]; then \
		printf "$(RED)✗ Error: Debes especificar CMD$(NC)\n"; \
		printf "$(YELLOW)Uso: make run CMD=\"tu_comando\"$(NC)\n"; \
		exit 1; \
	fi
	@printf "$(BLUE)→ Ejecutando: $(CMD)$(NC)\n"
	railway run $(CMD)

# ──────────────────────────────────────────────────────────────
# ALIASES
# ──────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help







