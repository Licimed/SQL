create or replace FUNCTION AD_GET_CUSTO_ESTOQUE (
    P_CODEMP             SMALLINT,
    P_CODPROD            INT,
    P_CONSIDERA_CREDITO  CHAR DEFAULT 'N'
) RETURN NUMBER
IS
    V_CUSTO_COMPRA  NUMBER := 0;
    V_CREDITO_ICMS  NUMBER := 0;
    V_APLICA_CREDITO CHAR(1);
BEGIN
    V_APLICA_CREDITO :=
        UPPER(
            TRIM(
                NVL(P_CONSIDERA_CREDITO, 'N')
            )
        );

    IF V_APLICA_CREDITO NOT IN ('S', 'N') THEN
        RAISE_APPLICATION_ERROR(
            -20201,
            'Parâmetro P_CONSIDERA_CREDITO inválido: '
            || P_CONSIDERA_CREDITO
            || '. Informe S ou N.'
        );
    END IF;

    BEGIN
        SELECT
            CASE
                WHEN NVL(CUS.CUSALTER, 0) > 0
                    THEN CUS.CUSALTER
                ELSE NVL(CUS.ULTCUS, 0)
            END
        INTO V_CUSTO_COMPRA
        FROM AD_CUSPROD CUS
        WHERE CUS.CODEMP = P_CODEMP
          AND CUS.CODPROD = P_CODPROD;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;

        WHEN TOO_MANY_ROWS THEN
            RAISE_APPLICATION_ERROR(
                -20202,
                'Existe mais de um custo cadastrado para o produto '
                || P_CODPROD
                || ' na empresa '
                || P_CODEMP
                || '.'
            );
    END;

    IF NVL(V_CUSTO_COMPRA, 0) <= 0 THEN
        RETURN 0;
    END IF;

    /*
     * O crédito somente é descontado quando a operação
     * de saída permitir sua consideração.
     */
    IF V_APLICA_CREDITO = 'S' THEN
        V_CREDITO_ICMS := NVL(
            AD_GET_CREDITO_ICMS_COMPRA(
                P_CODEMP,
                P_CODPROD
            ),
            0
        );
    ELSE
        V_CREDITO_ICMS := 0;
    END IF;

    RETURN ROUND(
        V_CUSTO_COMPRA - V_CREDITO_ICMS,
        6
    );
END;