# Fondamenti di programmazione 30/09 – Modello di Von Neumann e RAM

## <font color="#4bacc6">Modello di Von Neumann</font>
ogni calcolatore (calcolatrice, microonde, PC) si riduce a tre blocchi collegati da un **bus**:
```
 [ CPU ]   [ RAM ]   [ I/O ]
    |         |         |
 ------------ BUS ------------
```
- **CPU**: esegue le istruzioni
- **RAM**: contiene dati e programma
- **I/O**: comunicazione con l'esterno (tastiera, schermo, disco...)
> la lavagna di questa lezione è solo questo schema: il resto viene dalle tue note scritte dello stesso giorno
---
## <font color="#4bacc6">Memoria RAM</font>
Random Access Memory: miliardi di celle, ognuna da **1 byte = 8 bit**, ognuna con il suo indirizzo
---
## <font color="#4bacc6">Il primo programma in C</font>
```c
#include <stdio.h>   // libreria standard di input/output (contiene printf)

int main(void) {     // punto di partenza del programma
    printf("Hello, World!\n");   // \n = a capo
    return 0;        // 0 = tutto ok
}
```
---
## <font color="#4bacc6">Variabili: cosa succede nella RAM</font>
dichiarare una variabile = riservare un intervallo di celle di RAM
```c
int nome = 0;
```
- `int` → il **tipo**: quante celle occupa (32 bit = 4 byte, valore massimo $2^{31} - 1 \approx 2{,}1$ miliardi)
- `nome` → solo un'etichetta per il programmatore, in RAM non esiste
- `0` → il **valore** scritto in quelle celle

| tipo | bit | contenuto |
|---|---|---|
| `char` | 8 | un carattere |
| `int` | 32 | intero |
| `float` | 32 | decimale |
| `double` | 64 | decimale con più precisione |

```c
printf("%zu", sizeof(x) * 8);   // dimensione di x in bit
printf("%d\n", x);              // il valore di x
printf("%p\n", (void *)&x);     // l'indirizzo di x
```
> `&` = "indirizzo di": restituisce dove sta la variabile, non il suo contenuto. Per stamparlo il formato giusto è `%p`, non `%d` (con `%d` il compilatore dà warning e il numero può uscire troncato)
