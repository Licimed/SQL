-- ============================================================
-- DIAGNÓSTICO DE CÁLCULO DE PREÇO DINÂMICO
-- Substitua o número da nota em todos os filtros abaixo.
-- ============================================================

DEFINE V_NUNOTA = 309524;

-- ============================================================
-- PARTE 1 — DADOS BRUTOS DA NOTA
-- Não chama nenhuma função customizada.
-- Execute primeiro para confirmar os inputs.
-- ============================================================
SELECT
    -- Identificação
    CAB.NUNOTA,
    CAB.CODEMP,
    CAB.CODPARC,
    CAB.CODTIPOPER,
    NVL(
        TO_NUMBER(NULLIF(TRIM(CAB.AD_IDPRECO), '')),
        5
    )                                AS "AD_IDPRECO (MARGEM %)",

    ITE.SEQUENCIA,
    ITE.CODPROD,
    PRO.DESCRPROD,
    ITE.VLRUNIT                      AS "VLRUNIT_NOTA",

    -- Empresa
    EMP.AD_PERCDESPOPER              AS "DESPOPER_%",
    EMP.AD_PERCFRETE                 AS "FRETE_EMP_%",

    -- Parceiro
    PAR.CLASSIFICMS,
    PAR.TIPPESSOA,
    PAR_CID.UF                       AS "UF_PARCEIRO",
    EMP_CID.UF                       AS "UF_EMPRESA",
    CASE
        WHEN EMP_CID.UF = PAR_CID.UF THEN 'INTRA-ESTADO'
        ELSE 'INTER-ESTADO'
    END                              AS "OPERACAO",
    PAR_UF.CODPAIS                   AS "COD_PAIS (55=BR)",

    -- Produto (grupos tributários)
    PRO.GRUPOPIS,
    PRO.GRUPOCOFINS,
    PRO.ORIGPROD                     AS "ORIGEM (0=NAC/2=8=EXT)",

    -- Frete por UF (tabela customizada)
    NVL(
        (SELECT TO_CHAR(PERCFRETE) || '%'
         FROM AD_FRETEPARAM
         WHERE CODUF = PAR_CID.UF
           AND ROWNUM = 1),
        '(não cadastrado — usa frete da empresa)'
    )                                AS "FRETE_UF",

    -- Custo direto (sem função)
    CUS.ULTCUS                       AS "ULTCUS",
    NVL(CUS.CUSALTER, 0)             AS "CUSALTER",
    CASE
        WHEN NVL(CUS.CUSALTER, 0) <> NVL(CUS.ULTCUS, 0)
         AND NVL(CUS.CUSALTER, 0) <> 0
        THEN CUS.CUSALTER
        ELSE CUS.ULTCUS
    END                              AS "CUSTO_EFETIVO",

    -- Alíquota ICMS gravada no item
    ITE.IDALIQICMS,
    ICM.ALIQUOTA                     AS "ICMS_ALIQUOTA_%",
    ICM.REDBASE                      AS "ICMS_REDBASE_%",
    ICM.ALIQINTDEST                  AS "ICMS_ALIQINTDEST_%",
    ICM.PERCICMSFCP                  AS "ICMS_FCP_%",
    ICM.CODTRIB                      AS "ICMS_CODTRIB"

FROM TGFCAB CAB
JOIN TGFITE ITE
    ON ITE.NUNOTA = CAB.NUNOTA
JOIN TGFPRO PRO
    ON PRO.CODPROD = ITE.CODPROD
JOIN TSIEMP EMP
    ON EMP.CODEMP = CAB.CODEMP
JOIN TSICID EMP_CID
    ON EMP_CID.CODCID = EMP.CODCID
JOIN TGFPAR PAR
    ON PAR.CODPARC = CAB.CODPARC
JOIN TSICID PAR_CID
    ON PAR_CID.CODCID = PAR.CODCID
JOIN TSIUFS PAR_UF
    ON PAR_UF.CODUF = PAR_CID.UF
LEFT JOIN AD_CUSPROD CUS
    ON CUS.CODPROD = ITE.CODPROD
   AND CUS.CODEMP  = CAB.CODEMP
LEFT JOIN TGFICM ICM
    ON ICM.IDALIQ = ITE.IDALIQICMS
WHERE CAB.NUNOTA = &V_NUNOTA
ORDER BY ITE.SEQUENCIA;


-- ============================================================
-- PARTE 2 — COMPOSIÇÃO DO PREÇO (chama as funções)
-- Execute após confirmar os inputs da Parte 1.
-- Mostra cada componente da fórmula e o preço resultante.
--
-- Fórmula:
--   PRECO = CUSTO / (1 - (PIS + COFINS + ICMS + DIFAL
--                         + FRETE + DESPOPER + MARGEM))
-- ============================================================
SELECT
    ITE.SEQUENCIA,
    ITE.CODPROD,
    PRO.DESCRPROD,
    ITE.VLRUNIT                                                   AS "VLRUNIT_NOTA",

    -- Margem
    NVL(TO_NUMBER(NULLIF(TRIM(CAB.AD_IDPRECO), '')), 5)           AS "MARGEM_%",

    -- Componentes individuais (em %)
    AD_GET_ALIQ_IMPOSTO_IFE(
        'PIS', RTRIM(PRO.GRUPOPIS),
        CAB.CODEMP, CAB.CODPARC, 'S', CAB.CODTIPOPER
    )                                                             AS "PIS_%",

    AD_GET_ALIQ_IMPOSTO_IFE(
        'COFINS', RTRIM(PRO.GRUPOCOFINS),
        CAB.CODEMP, CAB.CODPARC, 'S', CAB.CODTIPOPER
    )                                                             AS "COFINS_%",

    AD_GET_ALIQICMS_PROPRIO(
        CAB.CODEMP, ITE.CODPROD, CAB.CODPARC, CAB.CODTIPOPER
    )                                                             AS "ICMS_PROPRIO_%",

    AD_GET_ALIQDIFAL(
        CAB.CODEMP, ITE.CODPROD, CAB.CODPARC, CAB.CODTIPOPER
    )                                                             AS "DIFAL_%",

    NVL(
        (SELECT PERCFRETE FROM AD_FRETEPARAM
         WHERE CODUF = (
             SELECT CID.UF FROM TGFPAR P JOIN TSICID CID ON CID.CODCID = P.CODCID
             WHERE P.CODPARC = CAB.CODPARC
         ) AND ROWNUM = 1),
        EMP.AD_PERCFRETE
    )                                                             AS "FRETE_%",

    EMP.AD_PERCDESPOPER                                           AS "DESPOPER_%",

    -- Custo efetivo
    AD_GET_CUSTO_ESTOQUE(CAB.CODEMP, ITE.CODPROD)                 AS "CUSTO_ESTOQUE",

    -- Soma de percentuais (em decimal)
    ROUND((
          NVL(AD_GET_ALIQ_IMPOSTO_IFE('PIS',    RTRIM(PRO.GRUPOPIS),    CAB.CODEMP, CAB.CODPARC, 'S', CAB.CODTIPOPER), 0)
        + NVL(AD_GET_ALIQ_IMPOSTO_IFE('COFINS', RTRIM(PRO.GRUPOCOFINS), CAB.CODEMP, CAB.CODPARC, 'S', CAB.CODTIPOPER), 0)
        + NVL(AD_GET_ALIQICMS_PROPRIO(CAB.CODEMP, ITE.CODPROD, CAB.CODPARC, CAB.CODTIPOPER), 0)
        + NVL(AD_GET_ALIQDIFAL(CAB.CODEMP, ITE.CODPROD, CAB.CODPARC, CAB.CODTIPOPER), 0)
        + NVL((SELECT PERCFRETE FROM AD_FRETEPARAM
               WHERE CODUF = (SELECT CID.UF FROM TGFPAR P JOIN TSICID CID ON CID.CODCID=P.CODCID WHERE P.CODPARC=CAB.CODPARC)
               AND ROWNUM=1), EMP.AD_PERCFRETE)
        + NVL(EMP.AD_PERCDESPOPER, 0)
        + NVL(TO_NUMBER(NULLIF(TRIM(CAB.AD_IDPRECO), '')), 5)
    ), 4)                                                         AS "TOTAL_PERCENTUAL_%",

    -- Divisor (1 - total/100)
    ROUND(1 - (
          NVL(AD_GET_ALIQ_IMPOSTO_IFE('PIS',    RTRIM(PRO.GRUPOPIS),    CAB.CODEMP, CAB.CODPARC, 'S', CAB.CODTIPOPER), 0)
        + NVL(AD_GET_ALIQ_IMPOSTO_IFE('COFINS', RTRIM(PRO.GRUPOCOFINS), CAB.CODEMP, CAB.CODPARC, 'S', CAB.CODTIPOPER), 0)
        + NVL(AD_GET_ALIQICMS_PROPRIO(CAB.CODEMP, ITE.CODPROD, CAB.CODPARC, CAB.CODTIPOPER), 0)
        + NVL(AD_GET_ALIQDIFAL(CAB.CODEMP, ITE.CODPROD, CAB.CODPARC, CAB.CODTIPOPER), 0)
        + NVL((SELECT PERCFRETE FROM AD_FRETEPARAM
               WHERE CODUF = (SELECT CID.UF FROM TGFPAR P JOIN TSICID CID ON CID.CODCID=P.CODCID WHERE P.CODPARC=CAB.CODPARC)
               AND ROWNUM=1), EMP.AD_PERCFRETE)
        + NVL(EMP.AD_PERCDESPOPER, 0)
        + NVL(TO_NUMBER(NULLIF(TRIM(CAB.AD_IDPRECO), '')), 5)
    ) / 100, 6)                                                   AS "DIVISOR",

    -- Preço calculado pela função
    AD_GET_PRECO_DINAMICO(CAB.CODEMP, CAB.CODPARC, ITE.CODPROD, CAB.NUNOTA) AS "PRECO_CALCULADO",

    -- Diferença em relação ao que está na nota
    ROUND(
        AD_GET_PRECO_DINAMICO(CAB.CODEMP, CAB.CODPARC, ITE.CODPROD, CAB.NUNOTA)
        - ITE.VLRUNIT,
        2
    )                                                             AS "DIFERENCA"

FROM TGFCAB CAB
JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
JOIN TSIEMP EMP ON EMP.CODEMP  = CAB.CODEMP
WHERE CAB.NUNOTA = &V_NUNOTA
ORDER BY ITE.SEQUENCIA;
