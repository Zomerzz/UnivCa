# Calcolatore
Ogni calcolatore, sia questo una calcolatrice, un microonde, o un  personal computer è semplificabile al minimo termine con il **Modello di Von Newman** 
![[fondamenti di programmazione 30 09 2026-09-30 13.14.36.excalidraw]]



```run-c
#include <stdio.h>  // include una libreria del core, che comprende anche printf ( per esempio )
  
int main(void) {   // funzione basilare del codice, funzione di exec
    printf("Hello, World!\n");  // printa su terminale la stringa "hello world" susseguita da un 
								//carattere speciale /n ( new line)
    return 0;  // chiude il processo di main con codice 0 ( tutto ok)
}
```

# variabili e tipi: cosa succede nella ram
in C la dichiarazione delle variabili non è altro che la dichiarazione di un range di memoria RAM, 
``` c
int nome = 0
```
questa definizione è composta da int ( il tipo della variabile) nome ( il nome della variabile) 0 ( il valore della variabile)
- int
	- int non è altro che la dichiarazione di un intervallo di memoria di 32 Bit ( 2 miliardi e qualcosa come valore massimo)
- nome
	- non inficia sulla RAM, è un nominativo di alto livello che serve al codice per distinguere l'allocazione 1 dalla 2 etc...
- 0
	-  valore che viene inserito nel intervallo di RAM

