# Analisi matematica 30/09 – Punti di un insieme e funzioni

## <font color="#4bacc6">Punti interni, esterni, di frontiera</font>
- $x_0$ è **interno** ad A se esiste un suo intorno (con $\delta$ piccolo a piacere) contenuto in A
- è **esterno** se è interno al complementare di A
- è di **frontiera** se non è né interno né esterno

l'insieme di tutti i punti interni si scrive $\mathring{A}$
$$x_{0} \in \mathring{A} \Rightarrow x_{0} \in A \qquad x_{0} \notin A \Rightarrow x_{0} \notin \mathring{A}$$
---
## <font color="#4bacc6">Punti di accumulazione</font>
$x_0$ è di **accumulazione** per A se in qualsiasi intorno di $x_0$ esiste un punto di A diverso da $x_0$ (cioè in ogni intorno ce ne sono infiniti)
- l'insieme dei punti di accumulazione si chiama **insieme derivato** di A
- un punto di A che NON è di accumulazione si dice **isolato**
- A è **discreto** se il suo derivato non ha elementi
- A è **aperto** se tutti i suoi punti sono interni, **chiuso** se il complementare è aperto
- **chiusura** = l'insieme aperto più le sue frontiere
> accumulazione = ci si può avvicinare quanto si vuole a $x_0$ restando dentro A
---
## <font color="#4bacc6">Teorema di Bolzano-Weierstrass</font>
ogni insieme infinito e limitato contenuto in $\mathbb{R}$ ha almeno un punto di accumulazione
> conseguenza: un insieme chiuso e limitato in $\mathbb{R}$ ammette massimo e minimo assoluto
---
## <font color="#4bacc6">Funzioni</font>
dati $A, B \subseteq \mathbb{R}$, una funzione è una legge che ad ogni $x \in A$ associa **un solo** $y \in B$
$$f : A \to B \qquad y = f(x)$$
A dominio, B codominio. Il grafico è un sottoinsieme del prodotto cartesiano $A \times B$
**immagine**: $f(A) = \{ y \in B : \exists x \in A, \ f(x) = y \}$ (tutte le "risposte" di f)
---
## <font color="#4bacc6">Classificazione</font>
- **suriettiva**: l'immagine coincide con il codominio, $f(A) = B$
- **iniettiva**: due x diversi non danno mai lo stesso y, $x_1 \ne x_2 \Rightarrow f(x_1) \ne f(x_2)$
- **biiettiva**: suriettiva e iniettiva insieme
- **pari**: $f(-x) = f(x)$ (simmetrica rispetto all'asse y) — **dispari**: $f(-x) = -f(x)$
- **periodica**: si ripete con periodo T, $\sin$ e $\cos$ ogni $2k\pi$, $\tan$ ogni $k\pi$
- **limitata** superiormente/inferiormente se esiste un numero maggiore/minore di tutti i suoi valori
---
## <font color="#4bacc6">Funzione composta</font>
una funzione che "ingloba" un'altra funzione, es. $f(x) = x^{2}$, $g(x) = 3x+2$
$$g \circ f = g(f(x)) = 3x^{2} + 2 \qquad f \circ g = f(g(x)) = (3x+2)^{2}$$
> attenzione: nella lavagna c'è $g \circ f = 3x+2$, ma il risultato giusto è $3x^{2}+2$ (il quadrato resta). L'ordine conta: $g \circ f \ne f \circ g$
---
## <font color="#4bacc6">Funzione inversa e monotonia</font>
il grafico dell'inversa è il simmetrico rispetto alla bisettrice del 1° e 3° quadrante ($y = x$)
f si dice **monotona** se è: strettamente crescente, crescente, strettamente decrescente o decrescente
---
## <font color="#4bacc6">Grafici elementari</font>
- retta $y = mx + q$: $m > 0$ sale, $m < 0$ scende, più $m$ è grande più è ripida
- $y = x^{2k}$ con $k \in \mathbb{N}$: più la potenza è alta, più la curva è "schiacciata" vicino a 0 e ripida fuori
