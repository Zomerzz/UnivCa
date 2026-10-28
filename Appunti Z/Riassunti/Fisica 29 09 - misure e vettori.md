# Fisica 29/09 – Unità di misura e vettori

> Fisica 1 = 8 CFU (laurea = 180 CFU). Per accedere ai parziali bisogna aver fatto almeno il 70% degli esercizi su Moodle. Primo parziale: 12/11/2026 ore 8:30. Esercitazioni ogni venerdì 14:30–18:30, aula 2 blocco N. Libro: Halliday, Resnick, Walker – Fondamenti di fisica
---
## <font color="#4bacc6">Misurare</font>
misurare = dare un valore a una grandezza fisica confrontandola con un'unità di misura (un campione di riferimento)
ogni misura ha 3 parti: **valore – incertezza – unità di misura**
errori:
- **casuali**: il risultato cambia ogni volta, si fa la media
- **sistematici**: cattiva calibrazione, malfunzionamento, drift
- (umani, di procedura, di ambiente)
---
## <font color="#4bacc6">Grandezze fondamentali (SI)</font>
| grandezza | unità | simbolo | dimensione |
|---|---|---|---|
| tempo | secondo | s | [T] |
| lunghezza | metro | m | [L] |
| massa | chilogrammo | kg | [M] |
| intensità di corrente | ampere | A | [I] |
| temperatura assoluta | kelvin | K | [Θ] |
| quantità di sostanza | mole | mol | [N] |
| intensità luminosa | candela | cd | [J] |

conversione: si moltiplica per un **fattore di conversione**, es. $1 \ \text{km} = 1000 \ \text{m}$
---
## <font color="#4bacc6">Vettori</font>
**scalare**: descritto da numero + unità (es. massa). **vettore**: serve anche una direzione (es. spostamento)
- **modulo** $\geq 0$ (se vale 1 è un **versore**)
- **direzione**: la retta su cui giace
- **verso**: dove punta lungo la retta

**principio di equipollenza**: due vettori sono uguali se hanno stesso modulo, direzione e verso, anche se non partono dallo stesso punto
---
## <font color="#4bacc6">Componenti cartesiane</font>
$$\vec{a} = a_{x}\hat{x} + a_{y}\hat{y} \qquad a_{x} = |\vec{a}|\cos\alpha \qquad a_{y} = |\vec{a}|\sin\alpha$$
$$|\vec{a}| = \sqrt{a_{x}^{2} + a_{y}^{2}} \qquad \alpha = \tan^{-1}\left(\frac{a_{y}}{a_{x}}\right)$$
---
## <font color="#4bacc6">Somma di vettori</font>
$$\vec{a} + \vec{b} = \vec{c}$$
- **metodo punta-coda**: la coda di $\vec{b}$ sulla punta di $\vec{a}$, il risultato va dall'origine di $\vec{a}$ alla punta di $\vec{b}$
- **metodo del parallelogramma**: stessa origine, si completa il parallelogramma, la somma è la diagonale
- per componenti: si sommano x con x e y con y
---
## <font color="#4bacc6">Prodotti</font>
**scalare · vettore**: il modulo diventa $x|\vec{a}|$, la direzione resta, il verso si inverte se $x < 0$
**prodotto scalare** (risultato = numero), si scrive $\vec{a} \cdot \vec{b}$
$$\vec{a} \cdot \vec{b} = |\vec{a}||\vec{b}|\cos\alpha = a_{x}b_{x} + a_{y}b_{y} + a_{z}b_{z}$$
**prodotto vettoriale** (risultato = vettore), si scrive $\vec{a} \times \vec{b}$
- modulo: $|\vec{a} \times \vec{b}| = |\vec{a}||\vec{b}|\sin\alpha$
- direzione: perpendicolare al piano di $\vec{a}$ e $\vec{b}$
- verso: regola della mano destra (pollice $\vec{a}$, indice $\vec{b}$, il medio indica il risultato)
- NON è commutativo: $\vec{a} \times \vec{b} = -\vec{b} \times \vec{a}$; vettori paralleli danno 0
$$\hat{x} \times \hat{y} = \hat{z} \qquad \hat{z} \times \hat{x} = \hat{y} \qquad \hat{y} \times \hat{z} = \hat{x}$$
> attenzione: nella lavagna il modulo del prodotto vettoriale è scritto come "prodotto scalare dei due moduli". Ci vuole il **seno** dell'angolo: $|\vec{a}||\vec{b}|\sin\alpha$ (con il coseno è il prodotto scalare)
