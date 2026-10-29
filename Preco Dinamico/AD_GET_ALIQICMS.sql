create or replace FUNCTION           AD_GET_ALIQICMS (
    P_CODEMP        INT,
    P_CODPROD       INT,
    P_CODPARC       INT,
    P_CODTIPOPER    INT
    )
RETURN FLOAT
IS
       V_VLRDIN				    FLOAT;
       V_CLASSIFICMS			CHAR(1);
       V_UFEMP				    INT;
       V_UFPAR				    INT;
       V_PERFIL				    CHAR(1);
       V_TIPPESSOA			    CHAR(1);
       V_CODPARC				INT;
       V_ALIQICMSIN			    FLOAT;
       V_ALIQICMSDES			FLOAT;
       V_ALIQCOMPETE			FLOAT;
       V_ALIQICMSFINAL		    FLOAT;
       V_ALIQICMSESTRANGEIRA	FLOAT;
       V_IDALIQ				    INT;
       V_REDBASE			    FLOAT;
       V_CODPROD                INT;
       V_ORIGPROD               VARCHAR2(1);
       V_CODPAIS			    INT;
       V_CODTRIB                INT;
       V_REPICMS                VARCHAR2(1);
       V_TIPCALCDIFAL           INT;
       V_CODGRUPOPROD           INT;
       V_GRUICMSPAR             INT;
       V_GRUICMSPRO             INT;
       V_GRUICMS2PRO            INT;
       V_REPREDBASE             CHAR(1);
       V_REPREDBASE2            CHAR(1);
BEGIN

    SELECT  ORIGPROD, CODGRUPOPROD, GRUPOICMS, GRUPOICMS2
        INTO  V_ORIGPROD, V_CODGRUPOPROD, V_GRUICMSPRO, V_GRUICMS2PRO
	FROM TGFPRO 
	WHERE CODPROD = P_CODPROD;


 BEGIN
    SELECT GRUPOICMS INTO V_GRUICMSPAR
    FROM TGFPAEM
    WHERE CODEMP = P_CODEMP AND
          CODPARC = P_CODPARC AND
          GRUPOICMS > 0 AND ROWNUM <= 1;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        DBMS_OUTPUT.PUT_LINE('Aviso: Grupo ICMS do Parceiro, '|| P_CODPARC ||', não encontrado, continuando execução.');
        V_GRUICMSPAR := NULL;
END;

	SELECT PAR.CLASSIFICMS, CID.UF, PAR.TIPPESSOA, UF.CODPAIS 
    INTO V_CLASSIFICMS, V_UFPAR, V_TIPPESSOA, V_CODPAIS
	FROM TGFPAR PAR, TSICID CID, TSIUFS UF
	WHERE PAR.CODCID = CID.CODCID AND
          CID.UF = UF.CODUF AND
		  PAR.CODPARC = P_CODPARC;

	SELECT CID.UF INTO V_UFEMP
	FROM TSIEMP EMP, TSICID CID
	WHERE	EMP.CODCID = CID.CODCID AND
			EMP.CODEMP = P_CODEMP; 

    BEGIN
        SELECT IDALIQ INTO V_IDALIQ
        FROM
        (
        SELECT  
                      I.IDALIQ  
                    FROM TGFICM I, TGFPRI P  
                    WHERE   
                          I.UFORIG = V_UFEMP  
                      AND I.UFDEST = V_UFPAR  
                      AND I.TIPRESTRICAO = P.TIPRESTRICAO1  
                      AND I.TIPRESTRICAO2 = P.TIPRESTRICAO2   
                      AND ( (I.TIPRESTRICAO = 'S') OR  
                            (I.TIPRESTRICAO = 'P' AND I.CODRESTRICAO = P_CODPARC) OR  
                              (I.TIPRESTRICAO = 'O' AND I.CODRESTRICAO = P_CODTIPOPER) OR  
                              (I.TIPRESTRICAO = 'G' AND I.CODRESTRICAO = V_CODGRUPOPROD) OR  
                            (I.TIPRESTRICAO = 'K' AND I.CODRESTRICAO = V_GRUICMS2PRO) OR 
                              (I.TIPRESTRICAO = 'E' AND I.CODRESTRICAO = V_GRUICMSPAR) OR  
                              (I.TIPRESTRICAO = 'I' AND I.CODRESTRICAO = V_GRUICMSPRO) OR  
                              (I.TIPRESTRICAO = 'M' AND I.CODRESTRICAO = P_CODEMP)  
                             )  
                      AND ( (I.TIPRESTRICAO2 = 'S') OR  
                            (I.TIPRESTRICAO2 = 'P' AND I.CODRESTRICAO2 = P_CODPARC) OR  
                              (I.TIPRESTRICAO2 = 'O' AND I.CODRESTRICAO2 = P_CODTIPOPER) OR  
                              (I.TIPRESTRICAO2 = 'G' AND I.CODRESTRICAO2 = V_CODGRUPOPROD) OR  
                            (I.TIPRESTRICAO2 = 'K' AND I.CODRESTRICAO2 = V_GRUICMS2PRO) OR 
                              (I.TIPRESTRICAO2 = 'E' AND I.CODRESTRICAO2 = V_GRUICMSPAR) OR  
                              (I.TIPRESTRICAO2 = 'I' AND I.CODRESTRICAO2 = V_GRUICMSPRO) OR  
                              (I.TIPRESTRICAO2 = 'M' AND I.CODRESTRICAO2 = P_CODEMP )  
                             ) 
                    ORDER BY P.PRIORIDADE

            ) WHERE ROWNUM <= 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            -- Nenhuma alíquota de ICMS configurada para esta combinação UF/produto/parceiro/operação
            RETURN 0;
    END;

	SELECT NVL(ALIQINTDEST,0) + NVL(PERCICMSFCP,0), NVL(ALIQUOTA ,0), NVL(REDBASE,0), NVL(ALIQESTRANGEIRA, 0), CODTRIB, NVL(REPICMS, 'N'), NVL(TIPCALCDIFAL,0), NVL(REPREDBASE, 'N'), NVL(REPREDBASE2, 'N')
        INTO V_ALIQICMSDES, V_ALIQICMSIN, V_REDBASE, V_ALIQICMSESTRANGEIRA, V_CODTRIB, V_REPICMS, V_TIPCALCDIFAL, V_REPREDBASE, V_REPREDBASE2
	FROM TGFICM
	WHERE IDALIQ = V_IDALIQ;

	V_REDBASE := (100 - V_REDBASE) / 100;
	V_ALIQCOMPETE := GET_TSIPAR_NUMERO('PNCOMPETE');

	IF V_TIPPESSOA = 'J' AND V_CLASSIFICMS = 'C' THEN
		V_PERFIL := 'J';
	ELSE
		V_PERFIL := V_CLASSIFICMS;
	END IF;

    IF NVL(V_ORIGPROD,'0') IN ('2','8') AND V_ALIQICMSESTRANGEIRA > 0 THEN
        V_ALIQICMSFINAL := V_ALIQICMSESTRANGEIRA;
        V_ALIQICMSIN := V_ALIQICMSESTRANGEIRA;
    END IF;

    	--CLIENTE ESTRANGEIRO OU N?O TRIBUTADO ALIQUOTA ZERADA
	IF V_CODPAIS <> 55 OR V_REDBASE = 0 OR V_CODTRIB IN (40,41) 
    THEN
		V_ALIQICMSFINAL := 0;
	ELSE
        --DENTRO DO ESTADO - ALIQUOTA DE ICMS PADR?O E CUSTO MEDIO SEM ICMS
        IF V_UFEMP = V_UFPAR THEN
            --RETURN 0;
            V_ALIQICMSFINAL := V_ALIQICMSIN * V_REDBASE;
        --FORA DO ESTADO - VERIFICAR ALIQUOTA E CUSTO GERENCIAL MEDIO
        ELSE
            --REVENDEDOR OU CONSUMIDOR CONTRIBUINTE - ALIQUOTA INTERESTADUAL REAL
            IF V_PERFIL IN ('R', 'X') THEN
                V_ALIQICMSFINAL := V_ALIQICMSIN * V_REDBASE;
                --V_ALIQICMSFINAL := 0;
            ELSE
                --PJ NÃO CONTRIBUINTE - DIFERENCA DESTINO E INTERNA + ICMS COMPETE
                IF V_PERFIL = 'J' THEN
                    IF V_TIPCALCDIFAL <> 4 THEN
                        V_ALIQICMSFINAL := V_ALIQICMSDES - V_ALIQICMSIN;
                    ELSE
                    --DIFAL 04 POR DENTRO
                        V_ALIQICMSFINAL := ROUND( (100 / (100 - V_ALIQICMSDES) ) * ( V_ALIQICMSDES - V_ALIQICMSIN) ,2);
                        --RETURN V_ALIQICMSFINAL;
                    END IF;

                    IF V_ALIQICMSFINAL < 0 THEN
                        V_ALIQICMSFINAL := V_ALIQICMSIN;
                    END IF;

                    V_ALIQICMSFINAL := V_ALIQICMSFINAL;
                    V_ALIQICMSFINAL := V_ALIQICMSFINAL + V_ALIQCOMPETE;
                ELSE
                    IF V_PERFIL = 'C' THEN

                        V_ALIQICMSFINAL := V_ALIQICMSDES;
                    END IF;
                END IF;
            END IF;
        END IF;

    END IF;


    IF V_REPICMS = 'S' OR V_REPREDBASE = 'S' OR V_REPREDBASE2 = 'S' THEN
        --V_ALIQICMSFINAL := V_ALIQICMSFINAL * 2;
        V_ALIQICMSFINAL := 0;
    END IF; 

  RETURN (V_ALIQICMSFINAL);
END;
