create or replace FUNCTION AD_GET_PRECO_DINAMICO (
    P_CODEMP      SMALLINT,
    P_CODPARC     INT,
    P_CODPROD     INT,
    P_NUNOTA      INT DEFAULT NULL,
    P_PERCLUC  NUMBER DEFAULT NULL
) RETURN NUMBER
IS
    V_CODTIPOPER          INT := 1100;

    /*
     * Percentual de margem antes da conversão.
     *
     * Valores permitidos:
     * 3, 4, 5, 6 ou 7.
     */
    V_PERCMARGEM          NUMBER := 5;
    V_ALIQMARGEM          NUMBER := 0;

    V_PRECO               NUMBER := 0;
    V_CUSTO               NUMBER := 0;

    V_ALIQPIS             NUMBER := 0;
    V_ALIQCOFINS          NUMBER := 0;
    V_ALIQICMS            NUMBER := 0;
    V_ALIQDIFAL           NUMBER := 0;
    V_ALIQFRETE           NUMBER := 0;
    V_DESPOPER            NUMBER := 0;

    V_PERCDESPOPER_EMP    NUMBER;
    V_PERCFRETE_EMP       NUMBER;
    V_PERCFRETE_UF        NUMBER;

    V_GRUPOPIS            VARCHAR2(30);
    V_GRUPOCOFINS         VARCHAR2(30);

    V_CODUFPAR            INT;

    V_TOTALPERCENTUAL     NUMBER := 0;
    V_DIVISOR             NUMBER := 0;
BEGIN
    /*
     * ============================================================
     * 1. PARÂMETROS DA EMPRESA
     * ============================================================
     */
    BEGIN
        SELECT
            AD_PERCDESPOPER,
            AD_PERCFRETE
        INTO
            V_PERCDESPOPER_EMP,
            V_PERCFRETE_EMP
        FROM TSIEMP
        WHERE CODEMP = P_CODEMP;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(
                -20101,
                'Empresa ' || P_CODEMP || ' não encontrada.'
            );
    END;

    V_DESPOPER := NVL(V_PERCDESPOPER_EMP, 0) / 100;

    /*
     * ============================================================
     * 2. CODTIPOPER E PERCENTUAL DE MARGEM
     * ============================================================
     *
     * O campo AD_IDPRECO armazena diretamente o percentual:
     * 3, 4, 5, 6 ou 7.
     *
     * Prioridade:
     * 1. P_PERCLUC informado explicitamente;
     * 2. AD_IDPRECO da nota;
     * 3. Padrão de 5%.
     */
    IF P_NUNOTA IS NOT NULL THEN
        BEGIN
            SELECT
                CODTIPOPER,
                NVL(
                    TO_NUMBER(
                        NULLIF(TRIM(AD_IDPRECO), '')
                    ),
                    5
                )
            INTO
                V_CODTIPOPER,
                V_PERCMARGEM
            FROM TGFCAB
            WHERE NUNOTA = P_NUNOTA;

        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(
                    -20102,
                    'Nota ' || P_NUNOTA || ' não encontrada.'
                );

            WHEN VALUE_ERROR THEN
                RAISE_APPLICATION_ERROR(
                    -20103,
                    'O valor de AD_IDPRECO da nota '
                    || P_NUNOTA
                    || ' não é numérico.'
                );
        END;
    END IF;

    -- O parâmetro informado explicitamente tem prioridade sobre a nota.
    IF P_PERCLUC IS NOT NULL THEN
        V_PERCMARGEM := P_PERCLUC;
    END IF;

    IF V_PERCMARGEM NOT IN (3, 4, 5, 6, 7) THEN
        RAISE_APPLICATION_ERROR(
            -20104,
            'Percentual de margem inválido: '
            || V_PERCMARGEM
            || '%. Informe 3, 4, 5, 6 ou 7%.'
        );
    END IF;

    V_ALIQMARGEM := V_PERCMARGEM / 100;

    /*
     * ============================================================
     * 3. GRUPOS TRIBUTÁRIOS DO PRODUTO
     * ============================================================
     */
    BEGIN
        SELECT
            GRUPOPIS,
            GRUPOCOFINS
        INTO
            V_GRUPOPIS,
            V_GRUPOCOFINS
        FROM TGFPRO
        WHERE CODPROD = P_CODPROD;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(
                -20105,
                'Produto ' || P_CODPROD || ' não encontrado.'
            );
    END;

    /*
     * ============================================================
     * 4. UF DO PARCEIRO
     * ============================================================
     */
    BEGIN
        SELECT CID.UF
        INTO V_CODUFPAR
        FROM TGFPAR PAR
        INNER JOIN TSICID CID
            ON CID.CODCID = PAR.CODCID
        WHERE PAR.CODPARC = P_CODPARC;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(
                -20106,
                'Parceiro ' || P_CODPARC
                || ' não encontrado ou sem cidade cadastrada.'
            );
    END;

    /*
     * ============================================================
     * 5. PERCENTUAL DE FRETE
     * ============================================================
     */
    BEGIN
        SELECT PERCFRETE
        INTO V_PERCFRETE_UF
        FROM AD_FRETEPARAM
        WHERE CODUF = V_CODUFPAR;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            V_PERCFRETE_UF := NULL;

        WHEN TOO_MANY_ROWS THEN
            RAISE_APPLICATION_ERROR(
                -20107,
                'Existe mais de uma configuração de frete para a UF '
                || V_CODUFPAR || ' na tabela AD_FRETEPARAM.'
            );
    END;

    IF V_PERCFRETE_UF IS NOT NULL THEN
        V_ALIQFRETE := V_PERCFRETE_UF / 100;

    ELSIF V_PERCFRETE_EMP IS NOT NULL THEN
        V_ALIQFRETE := V_PERCFRETE_EMP / 100;

    ELSE
        RAISE_APPLICATION_ERROR(
            -20108,
            'Percentual de frete não configurado para a UF '
            || V_CODUFPAR
            || ' e também não informado no campo AD_PERCFRETE '
            || 'da empresa ' || P_CODEMP || '.'
        );
    END IF;

    /*
     * ============================================================
     * 6. PIS E COFINS
     * ============================================================
     */
    V_ALIQPIS :=
        NVL(
            AD_GET_ALIQ_IMPOSTO_IFE(
                'PIS',
                RTRIM(V_GRUPOPIS),
                P_CODEMP,
                P_CODPARC,
                'S',
                V_CODTIPOPER
            ),
            0
        ) / 100;

    V_ALIQCOFINS :=
        NVL(
            AD_GET_ALIQ_IMPOSTO_IFE(
                'COFINS',
                RTRIM(V_GRUPOCOFINS),
                P_CODEMP,
                P_CODPARC,
                'S',
                V_CODTIPOPER
            ),
            0
        ) / 100;

    /*
     * ============================================================
     * 7. ICMS PRÓPRIO
     * ============================================================
     */
    V_ALIQICMS :=
        NVL(
            AD_GET_ALIQICMS_PROPRIO(
                P_CODEMP,
                P_CODPROD,
                P_CODPARC,
                V_CODTIPOPER
            ),
            0
        ) / 100;

    /*
     * ============================================================
     * 8. DIFAL
     * ============================================================
     */
    V_ALIQDIFAL :=
        NVL(
            AD_GET_ALIQDIFAL(
                P_CODEMP,
                P_CODPROD,
                P_CODPARC,
                V_CODTIPOPER
            ),
            0
        ) / 100;

    /*
     * ============================================================
     * 9. CUSTO DO PRODUTO
     * ============================================================
     *
     * Nacional:    custo = compra - 12% de crédito de ICMS
     * Estrangeiro: custo = compra -  4% de crédito de ICMS
     *
     * Considera o crédito de ICMS da compra somente quando
     * existir ICMS próprio na operação de saída.
     */
    V_CUSTO := AD_GET_CUSTO_ESTOQUE(
        P_CODEMP,
        P_CODPROD,
        CASE
            WHEN NVL(V_ALIQICMS, 0) > 0 THEN 'S'
            ELSE 'N'
        END
    );

    IF NVL(V_CUSTO, 0) <= 0 THEN
        /*
         * Mantém o comportamento atual.
         * A procedure utilizará o SNK_PRECO como alternativa.
         */
        RETURN 0;
    END IF;

    /*
     * ============================================================
     * 10. SOMA DOS PERCENTUAIS
     * ============================================================
     */
    V_TOTALPERCENTUAL :=
          V_ALIQPIS
        + V_ALIQCOFINS
        + V_ALIQICMS
        + V_ALIQDIFAL
        + V_ALIQFRETE
        + V_DESPOPER
        + V_ALIQMARGEM;

    V_DIVISOR := 1 - V_TOTALPERCENTUAL;

    IF V_DIVISOR <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20110,
            'Não foi possível calcular o preço. '
            || 'A soma dos impostos, frete, despesas e margem '
            || 'é igual ou superior a 100%. Total encontrado: '
            || ROUND(V_TOTALPERCENTUAL * 100, 4) || '%.'
        );
    END IF;

    /*
     * ============================================================
     * 11. PREÇO FINAL
     * ============================================================
     */
    V_PRECO := ROUND(
        V_CUSTO / V_DIVISOR,
        6
    );

    RETURN NVL(V_PRECO, 0);
END;