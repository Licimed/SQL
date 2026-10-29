create or replace FUNCTION AD_GET_ALIQ_CRED_ICMS (
    P_CODPROD INT
) RETURN NUMBER
IS
    V_ORIGPROD TGFPRO.ORIGPROD%TYPE;
BEGIN
    SELECT NVL(ORIGPROD, '0')
      INTO V_ORIGPROD
      FROM TGFPRO
     WHERE CODPROD = P_CODPROD;

    /*
     * Produtos nacionais.
     */
    IF V_ORIGPROD IN ('0', '4', '5', '6', '7') THEN
        RETURN 12;

    /*
     * Produtos estrangeiros.
     */
    ELSIF V_ORIGPROD IN ('1', '2', '3', '8') THEN
        RETURN 4;

    ELSE
        RAISE_APPLICATION_ERROR(
            -20201,
            'Origem do produto ' || P_CODPROD ||
            ' não reconhecida: ' || NVL(V_ORIGPROD, 'NULL')
        );
    END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(
            -20202,
            'Produto ' || P_CODPROD || ' não encontrado.'
        );
END;