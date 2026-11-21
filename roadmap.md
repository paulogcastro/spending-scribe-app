# Melhorias financeiras
- [x] Visual neutro, indicadores no topo e navegação por abas.
- [x] Progresso das metas e orçamento restante por dia/semana.
- [x] Busca e filtros de despesas diárias.
- [x] Exportação e restauração de backup com validação e confirmação.
- [x] Testes das regras financeiras e verificação no computador/celular.

# Fundação de ciclos financeiros
- [x] Criar identificação e navegação local de ciclos com fronteira no dia 4.
- [x] Persistir ciclos e seleção em chave independente, sem migrar histórico.
- [x] Preservar os módulos mensais por compatibilidade documentada.
- [x] Testar datas, persistência, preservação e navegação na aplicação.

# Renda e planejamento por ciclo (Bloco 2)
- [x] Planejamento versionado por cycleId em chave própria, sem tocar no legado mensal.
- [x] Salário planejado/recebido e rendas extras com acréscimo automático na meta de investimento.
- [x] Meta principal de despesas e distribuição em cinco submetas com residual em Gastos diários.
- [x] Cópia de configurações do ciclo anterior sem realizações, e testes das regras.

# Coerência dos indicadores (Bloco 2.2)
- [x] Identificar registros, indicadores, gráficos e ritmo como mensais legados.
- [x] Separar meta de investimento do ciclo e realizado mensal, sem comparação.
- [x] Identificar cópia mensal legada sem alterar sua lógica ou o planejamento.
- [x] Executar testes e verificar períodos, navegação e cópia na aplicação.

# Fundação do domínio de despesas (Bloco 3.1)
- [x] Criar entidades, referências e persistência independente por ciclo, sem operações na interface.
- [x] Incluir domínio no backup v3, preservando v1/v2 e rollback.
- [x] Testar validação, persistência, referências, backups e isolamento; executar lint e conferir build (lint geral com 6 erros e 7 avisos preexistentes; arquivos alterados sem erros).

# Lançamentos manuais (Bloco 3.2)
- [x] Ajustar regras grupo/natureza, vínculo e datas; CRUD avulso e catálogos com histórico preservado.
- [x] Integrar Carro, Casa e Gastos diários por ciclo, separados do legado, com confirmação de exclusão.
- [x] Testar regras, persistência, backup, ciclos anteriores e uso no computador/celular (78 testes; build automático OK).

# Recorrências e parcelamentos (Bloco 3.3)
- [x] Implementar definições com alterações futuras, geração idempotente e correção isolada de ocorrências.
- [x] Integrar gerenciamento, estados e previsão de compromissos à aba Despesas do ciclo.
- [x] Testar histórico, suspensão, parcelas, backups e navegação no computador/celular; conferir build automático (96 testes aprovados, fluxo completo e backup v3 verificados; build OK).

# Limpeza e reorganização da interface
- [ ] Priorizar Despesas e Planejamento do ciclo e mover o controle mensal para acesso secundário.
- [ ] Simplificar textos e hierarquia sem alterar regras ou dados.
- [ ] Verificar navegação, ciclos, integridade, computador/celular e testes; conferir compilação automática.