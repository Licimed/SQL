create or replace FUNCTION AD_GET_CREDITO_ICMS_COMPRA (
    P_CODEMP  INT,
    P_CODPROD INT
) RETURN NUMBER
IS
    V_ULTCUS       NUMBER := 0;
    V_CUSALTER     NUMBER := 0;
    V_VALORCOMPRA  NUMBER := 0;
    V_ALIQUOTA     NUMBER := 0;
    V_CREDITOICMS  NUMBER := 0;
BEGIN
    BEGIN
        SELECT
            NVL(ULTCUS, 0),
            NVL(CUSALTER, 0)
        INTO
            V_ULTCUS,
            V_CUSALTER
        FROM AD_CUSPROD
        WHERE CODEMP = P_CODEMP
          AND CODPROD = P_CODPROD;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;

        WHEN TOO_MANY_ROWS THEN
            RAISE_APPLICATION_ERROR(
                -20203,
                'Existe mais de um custo para o produto ' ||
                P_CODPROD || ' na empresa ' || P_CODEMP || '.'
            );
    END;

    /*
     * Mantém a lógica já usada no preço dinâmico:
     * CUSALTER substitui o último custo quando estiver preenchido.
     */
    IF V_CUSALTER > 0 THEN
        V_VALORCOMPRA := V_CUSALTER;
    ELSE
        V_VALORCOMPRA := V_ULTCUS;
    END IF;

    IF V_VALORCOMPRA <= 0 THEN
        RETURN 0;
    END IF;

    V_ALIQUOTA := AD_GET_ALIQ_CRED_ICMS(P_CODPROD);

    V_CREDITOICMS := ROUND(
        V_VALORCOMPRA * (V_ALIQUOTA / 100),
        6
    );

    RETURN NVL(V_CREDITOICMS, 0);
END;