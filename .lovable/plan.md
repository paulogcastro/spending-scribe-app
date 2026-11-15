# Relatório de auditoria funcional (somente diagnóstico — nenhuma alteração será feita)

Legenda: **[IMPL]** implementado e lido no código · **[REGRA]** regra encontrada no código · **[NÃO CONFIRMADO]** não verificado nesta auditoria (sem teste em navegador nesta rodada).

## 0. Estrutura geral
- [IMPL] Uma única tela (`/`), com cabeçalho (seletor de mês, "Copiar para próximo mês", Exportar/Restaurar backup), painel de acompanhamento no topo e 3 abas: **Despesas diárias** (aberta por padrão), **Planejamento**, **Resumo e gráficos**.
- [REGRA] Todos os dados ficam no navegador (chave `finance-tracker-data`), organizados por mês (`AAAA-MM`). Preferências de categoria do importador ficam em `finance-import-categories`. Não há login nem nuvem.
- [REGRA] Cada alteração grava imediatamente o objeto completo de todos os meses.
- [REGRA] Mês inexistente é exibido vazio, mas só é gravado quando algo é alterado nele.

## 1. Seletor de mês
- [IMPL] Setas anterior/próximo; abre no mês atual do computador.
- [REGRA] Trocar de mês não altera dados; cada mês é independente. Histórico é preservado indefinidamente (não há exclusão de mês).

## 2. Renda (aba Planejamento)
- Campos: Descrição, Valor.
- [IMPL] Incluir (exige descrição), editar descrição (clique) e valor, excluir, arrastar para reordenar.
- [REGRA] O tipo de dado possui também "planejado" e "observação", mas apenas o valor "atual" entra nos cálculos; "planejado" não é editável na tela.
- [REGRA] Total = soma dos valores.

## 3. Investimentos (aba Planejamento)
- Campos: Meta de investimento (do mês), Descrição, Valor.
- [IMPL] Incluir, editar, excluir, reordenar; exibe Meta, Investido e Diferença.
- [REGRA] Investimentos NÃO são somados nas despesas.

## 4. Casa e Carro (aba Planejamento)
- Campos: Meta do grupo, Descrição, Valor; Carro tem também Parcelas (texto livre, ex. "1/12"); observação opcional.
- [IMPL] Incluir (exige descrição), editar, excluir, reordenar; barra de progresso da meta.
- [REGRA] "Parcelas" é texto livre, sem validação nem cálculo.
- [REGRA] Todo item de Casa conta na categoria "Casa"; todo item de Carro na categoria "Carro".

## 5. Parcelados / Mensais (aba Planejamento)
- Campos: Descrição, Parcelas, Categoria (todas exceto Investimento), Forma de pagamento (Cartão Mãe, Cartão Inter, Mercado Pago, Pix), Recorrente, Valor, observação; Meta do grupo.
- [IMPL] Incluir (exige descrição), editar, excluir, reordenar.
- [REGRA] Marcar "Recorrente" desabilita o campo Parcelas (o texto já digitado não é apagado).
- [REGRA] O valor entra na categoria escolhida (padrão "Outros").

## 6. Despesas diárias (aba principal)
- Campos: Descrição, Valor, Categoria (11 opções), Fonte (Inter Crédito, Pix, Neon, Mercado Pago), Data, Observação; Meta do grupo.
- [IMPL] Incluir (exige descrição e valor > 0), editar todos os campos na linha, excluir (sem confirmação), reordenar.
- [IMPL] Busca (descrição/observação), filtro por categoria e fonte, contador "X de Y" com total filtrado, "Limpar filtros".
- [REGRA] Novos gastos entram no topo da lista. Arrastar fica desligado enquanto há filtro.
- [REGRA] Data padrão vem do relógio em UTC (pode sugerir o dia seguinte após 21h no horário de Brasília).
- [REGRA] Alterar a data de um gasto NÃO o move para outro mês; ele continua no mês em que foi lançado.

## 7. Importação de extrato (botão ao lado do "+" em Despesas diárias)
- [IMPL] Aceita CSV e OFX; tenta UTF-8 e, se houver caracteres inválidos, Windows-1252.
- [REGRA] CSV: localiza a linha de cabeçalho com "Data" e "Valor"; detecta separador `;` ou `,`; descrição em colunas tipo descrição/lançamento/histórico/estabelecimento. Se houver valores negativos, considera só negativos (extrato); senão, só positivos (fatura).
- [REGRA] OFX: lê blocos de transação; considera somente valores negativos.
- [REGRA] Ignora pagamento de fatura, estorno e "crédito de".
- [REGRA] Duplicata = mesma data + descrição normalizada + valor, comparada apenas com os gastos do **mês aberto**. Duplicatas vêm desmarcadas mas podem ser marcadas.
- [REGRA] Categoria sugerida: primeiro a escolha lembrada para aquele estabelecimento; depois palavras‑chave (ifood→Besteira, restaurante→Almoço, mercado→Alimentação, posto/uber/99→Carro, farmácia→Saúde, pet→Tiriri, netflix/cinema→Lazer); senão "Outros".
- [REGRA] Ao confirmar, a categoria de cada item é memorizada; uma única Fonte (padrão Inter Crédito) vale para todos.
- [REGRA] Todos os itens vão para o **mês aberto na tela**, independentemente da data da transação.

## 8. Painel do topo
- [IMPL] Renda do mês; Despesas do mês (+ "% da meta total"); Saldo após investimentos; Total investido.
- [REGRA] Despesas = Casa + Carro + Parcelados + Diárias. Meta total = soma das 4 metas.
- [REGRA] Saldo = Renda − Despesas − **investido real**.
- [IMPL] "Quanto ainda posso gastar?" usa **apenas** a meta e o gasto das Despesas diárias: Restante = meta − gasto; Por dia = restante (mínimo 0) ÷ dias restantes incluindo hoje; Próximos 7 dias = por dia × mín(7, dias restantes). Mês passado = 0 dias; mês futuro = mês inteiro. Sem meta mostra "—".
- [REGRA] Status da meta: até 80% seguro, ≥80% atenção, >100% acima.

## 9. Resumo e gráficos
- [IMPL] Meta de despesas × gasto; Resultado = Renda − Despesas; Meta de investimento; "Resultado − Meta de investimento".
- [IMPL] Gráfico de rosca por categoria (inclui Investimento e a fatia "Disponível" = Renda − tudo, se positivo); percentuais sobre a Renda total; lista ordenada por valor com troca valor/% ao passar o mouse.
- [IMPL] Barras de despesas diárias por dia; tabela Despesas por grupo com metas.
- [REGRA] Divergência: o topo desconta o investido real; o resumo desconta a **meta** de investimento.

## 10. Copiar para próximo mês
- [REGRA] Copia Renda, Casa, Carro, metas de grupo e meta de investimento; copia Parcelados apenas se recorrentes ou com "/" nas parcelas.
- [REGRA] Não copia Despesas diárias nem os itens de Investimento.
- [REGRA] **Substitui** (não mescla) Renda/Casa/Carro/Parcelados já existentes no mês seguinte, sem pedir confirmação.
- [REGRA] Parcelas não avançam (ex.: "3/12" continua "3/12"); parcelas finais (ex.: "12/12") também são copiadas.

## 11. Backup e restauração
- [IMPL] Exportar baixa `controle-gastos-backup-AAAA-MM-DD.json` com todos os meses e categorias memorizadas.
- [IMPL] Restaurar valida o arquivo, pede confirmação e **substitui tudo**; se a gravação falhar, os dados anteriores são mantidos.
- [REGRA] Validação: versão 1, mês coerente com a chave, IDs únicos por grupo, valores não negativos, datas AAAA-MM-DD, categorias/fontes/cartões conhecidos.
- [REGRA] A exportação passa pela mesma validação; dado incompatível (ex.: valor negativo) faz a exportação falhar.

## 12. Relações entre módulos
```text
Renda ─┐
Casa ──┼─> Despesas do mês ─> Resultado / Saldo / % da meta total
Carro ─┤                      Rosca por categoria (+ Investimento, Disponível)
Parcel.┤
Diárias┴─> "Quanto posso gastar" (só Diárias) e barras por dia
Investimentos ─> Total investido, Saldo do topo, rosca
Importador ─> Diárias (mês aberto) + categorias memorizadas ─> Backup
```

## 13. Não confirmado nesta auditoria
- Comportamento visual atual de cada tela (sem teste em navegador nesta rodada).
- Funcionamento com extratos reais do Inter (testado só com arquivos de exemplo anteriormente).
- Comportamento em celular e com grande volume de dados.
- Se a máscara de moeda aceita valores negativos.

## 14. Pontos para investigação adicional
1. Importação grava tudo no mês aberto, mesmo com datas de outros meses.
2. Duplicatas só são detectadas no mês aberto.
3. "Copiar para próximo mês" sobrescreve sem aviso e não avança parcelas.
4. Saldo do topo e Resultado do resumo usam bases diferentes para investimento.
5. Ritmo de gastos considera apenas Despesas diárias.
6. Data padrão em UTC pode registrar o dia seguinte à noite.
7. Editar a data de um gasto não o move de mês.
8. Exclusões não pedem confirmação nem permitem desfazer.
9. Campo "planejado" da Renda existe nos dados, mas não é usado.
10. Arquivos antigos sem uso aparente: `useExpenses`, `ExpenseForm`, `ExpenseList`, `SummaryCards`, `ExpenseChart`, `types/expense`.
11. Exportação de backup pode falhar se houver dados antigos fora do formato validado.
12. Dados restritos a um navegador; limpar o navegador apaga tudo sem backup.
