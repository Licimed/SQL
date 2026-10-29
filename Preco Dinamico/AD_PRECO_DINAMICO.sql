create or replace PROCEDURE AD_PRECO_DINAMICO (
    P_IDSESSAO VARCHAR2,
    P_RESULT   OUT VARCHAR2
)
AS
    /*
     * Tipo de parceiro privado.
     */
    C_TIPPARC_PRIVADO CONSTANT NUMBER := 20301000;

    /*
     * Dados da sessão/nota.
     */
    V_NUNOTA      NUMBER;
    V_CODPROD     NUMBER;
    V_CODPARC     NUMBER;
    V_CODEMP      NUMBER;

    /*
     * Configurações.
     */
    V_CODTIPPARC  NUMBER;
    V_CODTAB      NUMBER := 1;
    V_PRECODIN    CHAR(1) := 'N';

    /*
     * Resultado do preço.
     */
    V_PRECO       NUMBER := 0;
    V_PRECO_D     NUMBER(18,6) := 0;
BEGIN
    /*
     * ============================================================
     * 1. DADOS DISPONÍVEIS NA SESSÃO
     * ============================================================
     *
     * NUNOTA permanece NULL quando não estiver disponível.
     */
    V_NUNOTA  := NULLIF(ACT_DEC_FIELD(P_IDSESSAO, 0, 'NUNOTA'), 0);
    V_CODPROD := NVL(ACT_DEC_FIELD(P_IDSESSAO, 0, 'CODPROD'), 0);
    V_CODPARC := NVL(ACT_DEC_FIELD(P_IDSESSAO, 0, 'CODPARC'), 0);
    V_CODEMP  := NVL(ACT_DEC_FIELD(P_IDSESSAO, 0, 'CODEMP'), 0);

    /*
     * ============================================================
     * 2. DADOS DO CABEÇALHO
     * ============================================================
     *
     * Quando houver nota, empresa e parceiro são obtidos da TGFCAB.
     */
    IF V_NUNOTA IS NOT NULL THEN
        BEGIN
            SELECT
                CAB.CODEMP,
                CAB.CODPARC
            INTO
                V_CODEMP,
                V_CODPARC
            FROM TGFCAB CAB
            WHERE CAB.NUNOTA = V_NUNOTA;

        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(
                    -20101,
                    'A nota ' || V_NUNOTA || ' não foi encontrada.'
                );
        END;
    END IF;

    /*
     * ============================================================
     * 3. VALIDAÇÕES BÁSICAS
     * ============================================================
     */
    IF NVL(V_CODEMP, 0) <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20102,
            'Empresa não informada para o cálculo do preço.'
        );
    END IF;

    IF NVL(V_CODPARC, 0) <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20103,
            'Parceiro não informado para o cálculo do preço.'
        );
    END IF;

    IF NVL(V_CODPROD, 0) <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20104,
            'Produto não informado para o cálculo do preço.'
        );
    END IF;

    /*
     * ============================================================
     * 4. PERFIL E TABELA DE PREÇO DO PARCEIRO
     * ============================================================
     */
    BEGIN
        SELECT
            NVL(PAR.CODTIPPARC, 0),
            NVL(PAR.CODTAB, 1)
        INTO
            V_CODTIPPARC,
            V_CODTAB
        FROM TGFPAR PAR
        WHERE PAR.CODPARC = V_CODPARC;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(
                -20105,
                'Parceiro ' || V_CODPARC || ' não encontrado.'
            );
    END;

    /*
     * ============================================================
     * 5. CONFIGURAÇÃO DA EMPRESA
     * ============================================================
     */
    BEGIN
        SELECT NVL(EMP.AD_PRECODINAMICO, 'N')
        INTO V_PRECODIN
        FROM TGFEMP EMP
        WHERE EMP.CODEMP = V_CODEMP;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(
                -20106,
                'Empresa ' || V_CODEMP || ' não encontrada.'
            );
    END;

    /*
     * ============================================================
     * 6. DEFINIÇÃO DO PREÇO
     * ============================================================
     *
     * O preço dinâmico é executado somente quando:
     *
     * - AD_PRECODINAMICO = 'S';
     * - CODTIPPARC = 20301000.
     */
    IF V_PRECODIN = 'S'
       AND V_CODTIPPARC = C_TIPPARC_PRIVADO
    THEN
        /*
         * A função é responsável por:
         *
         * - Buscar o CODTIPOPER da nota;
         * - Buscar o percentual em TGFCAB.AD_IDPRECO;
         * - Aplicar 5% quando AD_IDPRECO estiver vazio;
         * - Validar os percentuais 3, 4, 5, 6 e 7.
         */
        V_PRECO := AD_GET_PRECO_DINAMICO(
            P_CODEMP  => V_CODEMP,
            P_CODPARC => V_CODPARC,
            P_CODPROD => V_CODPROD,
            P_NUNOTA  => V_NUNOTA
        );
  
        /*
         * Sem custo disponível para cálculo dinâmico,
         * utiliza a tabela padrão do parceiro.
         */
        IF NVL(V_PRECO, 0) <= 0 THEN
            V_PRECO := SNK_PRECO(
                V_CODTAB,
                V_CODPROD
            );
        END IF;

    ELSE
        /*
         * Parceiro não privado ou empresa sem preço dinâmico:
         * utiliza somente a tabela padrão do parceiro.
         */
        V_PRECO := SNK_PRECO(
            V_CODTAB,
            V_CODPROD
        );
    END IF;

    /*
     * ============================================================
     * 7. RESULTADO
     * ============================================================
     */
    V_PRECO_D := ROUND(
        NVL(V_PRECO, 0),
        6
    );

    P_RESULT :=
          '{'
        || 'PRECO : "'
        || TO_CHAR(
               V_PRECO_D,
               'FM999999999999990D000000',
               'NLS_NUMERIC_CHARACTERS=''.,'''
           )
        || '",'
        || 'PRECOBASE : "'
        || TO_CHAR(
               V_PRECO_D,
               'FM999999999999990D000000',
               'NLS_NUMERIC_CHARACTERS=''.,'''
           )
        || '",'
        || 'AD_TIPOPRECO : "T"'
        || '}';

EXCEPTION
    WHEN OTHERS THEN
        /*
         * Mantém os erros de negócio gerados pela procedure,
         * pela função de preço dinâmico ou pelas funções auxiliares.
         */
        IF SQLCODE BETWEEN -20999 AND -20000 THEN
            RAISE;
        END IF;

        RAISE_APPLICATION_ERROR(
            -20199,
            SUBSTR(
                  'Falha no cálculo de preço dinâmico. '
                || 'Erro: ' || SQLERRM
                || ' | Linha: '
                || DBMS_UTILITY.FORMAT_ERROR_BACKTRACE,
                1,
                2000
            )
        );
END;