# Analisi matematica 28/09 – Insiemi e insiemi numerici

## <font color="#4bacc6">Sottoinsiemi e insieme vuoto</font>
un insieme può essere contenuto dentro un altro insieme, si dice "sottoinsieme"
$$B \subseteq A$$
un insieme privo di elementi si chiama insieme vuoto: $\emptyset$
> se tutti gli elementi di B stanno anche in A, allora B è un sottoinsieme di A
---
## <font color="#4bacc6">Operazioni tra insiemi</font>
**intersezione**: l'insieme formato da tutti gli elementi comuni tra A e B
$$A \cap B = \{ x : x \in A \ \text{e} \ x \in B \}$$
**unione**: tutti gli elementi che appartengono ad A e tutti quelli che appartengono a B (comuni e non comuni)
$$A \cup B = \{ x : x \in A \ \text{o} \ x \in B \}$$
**complementare** di B rispetto a X: gli elementi che appartengono a X ma non a B
$$X \setminus B = B^{c} = \{ x \in X : x \notin B \}$$
**prodotto cartesiano**: dati A e B (anche non distinti), l'insieme di tutte le coppie ordinate
$$A \times B = \{ (a,b) : a \in A, \ b \in B \}$$
> intersezione = la parte in comune dei due cerchi, unione = tutti e due i cerchi, complementare = tutto quello che sta "fuori" da B dentro X
---
## <font color="#4bacc6">Insiemi numerici</font>
$$\mathbb{N} \subset \mathbb{Z} \subset \mathbb{Q} \subset \mathbb{R} \subset \mathbb{C}$$
- $\mathbb{N}$ naturali: solo somma e moltiplicazione sono ben definite (restano in N)
- $\mathbb{Z}$ interi: positivi e negativi, permette la sottrazione
- $\mathbb{Q}$ razionali: tutti i numeri ottenibili dividendo due interi, permette $+ - \cdot /$ ma NON la radice
- irrazionali $\mathbb{I}$: infiniti decimali che non si ripetono
- $\mathbb{R}$ reali: razionali + irrazionali, ma le radici dei numeri negativi sono escluse
- $\mathbb{C}$ complessi: comprendono anche le radici dei numeri negativi
> ogni insieme "allarga" il precedente per permettere un'operazione in più
---
## <font color="#4bacc6">Numeri complessi</font>
si introduce l'unità immaginaria $i$, con $i^{2} = -1$
forma algebrica:
$$z = a + ib \qquad a, b \in \mathbb{R}$$
> si rappresentano su un piano: asse orizzontale la parte reale, asse verticale la parte immaginaria
---
## <font color="#4bacc6">Intervalli</font>
dati $a, b \in \mathbb{R}$ con $a \le b$:
$$[a,b] = \{ x \in \mathbb{R} : a \le x \le b \} \ \text{(chiuso)} \qquad (a,b) = \{ x \in \mathbb{R} : a < x < b \} \ \text{(aperto)}$$
$$[a,b) = \{ x \in \mathbb{R} : a \le x < b \} \qquad (a,b] = \{ x \in \mathbb{R} : a < x \le b \}$$
> pallino pieno = estremo compreso ($\le$, parentesi quadra chiusa), pallino vuoto = estremo escluso ($<$, parentesi tonda o quadra rovesciata)
---
## <font color="#4bacc6">Intorno</font>
dato un punto $x_{0}$ e una distanza $\delta > 0$, l'intorno sono i punti che distano da $x_{0}$ meno di $\delta$
$$|x - x_{0}| < \delta \iff -\delta < x - x_{0} < \delta \iff x_{0} - \delta < x < x_{0} + \delta$$
> è un "intervallino" centrato in $x_0$, largo $\delta$ da entrambi i lati
---
## <font color="#4bacc6">Insiemi limitati, maggioranti e minoranti</font>
un insieme si dice limitato se è contenuto in un intervallo centrato in 0
**maggiorante**: $k$ è maggiorante di A se $\forall x \in A : x \le k$
**minorante**: $k$ è minorante di A se $\forall x \in A : x \ge k$
- se A ha un maggiorante → limitato superiormente
- se A ha un minorante → limitato inferiormente
- se è limitato sia superiormente che inferiormente → **LIMITATO**
---
## <font color="#4bacc6">Estremi, massimo e minimo</font>
$$\sup A = \text{il più piccolo dei maggioranti} \qquad \inf A = \text{il più grande dei minoranti}$$
- se $\sup A \in A$ allora si chiama **massimo** di A
- se $\inf A \in A$ allora si chiama **minimo** di A
- intervallo aperto a destra → niente massimo, aperto a sinistra → niente minimo
> esempio: in $[1,5)$ il minimo è 1, il sup è 5 ma il massimo non esiste
---
## <font color="#4bacc6">Punti interni, esterni e di frontiera</font>
- **interno**: esiste un intorno di $x_0$ completamente contenuto in A
- **esterno**: esiste un intorno di $x_0$ completamente contenuto nel complementare di A
- **frontiera**: non è né interno né esterno
