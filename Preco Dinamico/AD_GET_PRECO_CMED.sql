create or replace FUNCTION AD_GET_PRECO_CMED (
    P_CODEMP      INT,
    P_CODPARC     INT,
    P_CODPROD     INT,
    P_CODTIPOPER  INT DEFAULT 1100
) RETURN NUMBER
IS
    C_GRUPO_MEDICAMENTOS CONSTANT NUMBER := 10100100;

    V_EH_MEDICAMENTO  NUMBER := 0;
    V_ALIQICMS         NUMBER := 0;

    V_CODUF            NUMBER;
    V_CODTAB_CMED      NUMBER;
    V_NUTAB_CMED       NUMBER;

    V_PRECO_CMED       NUMBER;
    V_QTD_PRECOS       NUMBER;
BEGIN
    /*
     * Verifica se o produto pertence ao grupo Medicamentos
     * ou a algum grupo abaixo dele.
     */
    SELECT COUNT(*)
      INTO V_EH_MEDICAMENTO
      FROM TGFPRO PRO
     WHERE PRO.CODPROD = P_CODPROD
       AND PRO.CODGRUPOPROD IN (
            SELECT GRU.CODGRUPOPROD
              FROM TGFGRU GRU
             START WITH GRU.CODGRUPOPROD = C_GRUPO_MEDICAMENTOS
           CONNECT BY NOCYCLE
                  PRIOR GRU.CODGRUPOPROD = GRU.CODGRUPAI
       );

    /*
     * Nutrição, alimentos e demais produtos não sujeitos ao CMED.
     */
    IF V_EH_MEDICAMENTO = 0 THEN
        RETURN 0;
    END IF;

    /*
     * Verifica a tributação de ICMS da operação atual.
     */
    V_ALIQICMS := NVL(
        AD_GET_ALIQICMS_PROPRIO(
            P_CODEMP,
            P_CODPROD,
            P_CODPARC,
            P_CODTIPOPER
        ),
        0
    );

    /*
     * Produto sem ICMS:
     * utiliza a tabela CMED PF 0% desonerado.
     */
    IF V_ALIQICMS <= 0 THEN
        BEGIN
            SELECT NTA.CODTAB
              INTO V_CODTAB_CMED
              FROM TGFNTA NTA
             WHERE UPPER(TRIM(NTA.AD_INDEXADORCMED)) = 'PF0'
               AND NVL(NTA.ATIVO, 'S') = 'S';

        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(
                    -20301,
                    'Não existe tabela CMED ativa configurada '
                    || 'com o indexador PF0.'
                );

            WHEN TOO_MANY_ROWS THEN
                RAISE_APPLICATION_ERROR(
                    -20302,
                    'Existe mais de uma tabela CMED ativa '
                    || 'configurada com o indexador PF0.'
                );
        END;

    ELSE
        /*
         * Produto tributado:
         * utiliza a tabela PF configurada no Estado do parceiro.
         */
        BEGIN
            SELECT
                UFS.CODUF,
                UFS.TABPRECOPF
            INTO
                V_CODUF,
                V_CODTAB_CMED
            FROM TGFPAR PAR
            INNER JOIN TSICID CID
                ON CID.CODCID = PAR.CODCID
            INNER JOIN TSIUFS UFS
                ON UFS.CODUF = CID.UF
            WHERE PAR.CODPARC = P_CODPARC;

        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(
                    -20303,
                    'Não foi possível localizar o Estado do parceiro '
                    || P_CODPARC || '.'
                );
        END;

        IF NVL(V_CODTAB_CMED, 0) <= 0 THEN
            RAISE_APPLICATION_ERROR(
                -20304,
                'Não existe tabela PF configurada no campo '
                || 'TSIUFS.TABPRECOPF para o Estado '
                || V_CODUF || '.'
            );
        END IF;
    END IF;

    /*
     * Localiza a versão vigente mais recente da tabela selecionada.
     */
    BEGIN
        SELECT NUTAB
          INTO V_NUTAB_CMED
          FROM (
                SELECT TAB.NUTAB
                  FROM TGFTAB TAB
                 WHERE TAB.CODTAB = V_CODTAB_CMED
                   AND TAB.DTVIGOR <= SYSDATE
                 ORDER BY
                       TAB.DTVIGOR DESC,
                       TAB.NUTAB DESC
          )
         WHERE ROWNUM = 1;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(
                -20305,
                'Não foi encontrada versão vigente da tabela CMED '
                || V_CODTAB_CMED || '.'
            );
    END;

    /*
     * Busca o preço genérico do produto na versão vigente.
     */
    SELECT
        COUNT(*),
        MAX(EXC.VLRVENDA)
    INTO
        V_QTD_PRECOS,
        V_PRECO_CMED
    FROM TGFEXC EXC
    WHERE EXC.NUTAB = V_NUTAB_CMED
      AND EXC.CODPROD = P_CODPROD
      AND NVL(EXC.CODLOCAL, 0) = 0
      AND NVL(TRIM(EXC.CONTROLE), ' ') = ' ';

    /*
     * Produto não cadastrado na tabela CMED selecionada.
     */
    IF V_QTD_PRECOS = 0 THEN
    RAISE_APPLICATION_ERROR(
        -20306,
        'O medicamento ' || P_CODPROD
        || ' não possui preço na tabela CMED '
        || V_CODTAB_CMED
        || ', versão ' || V_NUTAB_CMED
        || '. Verifique o cadastro da tabela.'
    );
    END IF;

    /*
     * Mais de um preço genérico representa inconsistência.
     */
    IF V_QTD_PRECOS > 1 THEN
        RAISE_APPLICATION_ERROR(
            -20307,
            'Existem ' || V_QTD_PRECOS
            || ' preços CMED genéricos para o produto '
            || P_CODPROD
            || ' na tabela ' || V_CODTAB_CMED
            || ', versão ' || V_NUTAB_CMED
            || '. Corrija o cadastro.'
        );
    END IF;

    RETURN ROUND(NVL(V_PRECO_CMED, 0), 6);
END;