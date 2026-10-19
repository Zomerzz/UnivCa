# <font color="#c0504d">Riepilogo argomenti 1° parziale</font> 
[[criteri di invertibilità e restrizione del dominio|espandi l'argomento a questo link]]

![[Pasted image 20261018154416.png|wrap-right|487]]
### <font color="#9bbb59">invertibilità di una funzione e restrizione del dominio</font>

Criteri invertibilità funzioni-dominio codominio e funzioni elementari.       

una funzione è invertibile quando essa è biiettiva, e cioè quando è sia suriettiva che iniettiva.

a ogni valore y dell'immagine corrisponde un solo valore x del dominio, non possono esistere due x diversi che producono lo stesso y.


ciò significa, che scelta una funzione f:A→B  definita come f:R->R (scelto
come dominio tutti i reali, e come codominio della y dove atterra la funzione, sempre
i reali) che ogni singolo valore del  codominio ha almeno un valore corrispondente
nel dominio, o come scritto sopra, ad ogni y corrisponde Almeno 1 x.

<font color="#ffff00">La funzione inversa:</font>
<font color="#92cddc">-iniettiva</font>: ogni y dell'immagine ha al massimo un x
<font color="#e36c09">-suriettiva</font>: ogni y del codominio ha almeno un x

importante: le funzioni crescenti o decrescenti sono invertibili secondo i criteri
visti precedentemente.

di conseguenza posso eseguire una restrizione del dominio ed analizzare una
funzione solo nel tratto in cui essa è strettamente monotona per studiarne l'inversa.

### <font color="#e36c09">Limiti di funzioni e limiti notevoli</font>

##### Definizione di limite
[[Limiti di funzioni 05-10-2026|per approfondire file lezione]]
definizione di limite:
sia $f(x)$ una funzione definita in un insieme $A \subseteq R$, e sia $x_{0}$ un punto di accumulazione per
A. si dice che f(x) ha limite per x che tende a x0, e si scrive:

![[Pasted image 20261018161248.png|wrap-right|446]]
# $\lim_{ x \to x_{0} }f(x)=l$
## $\forall\epsilon>0 \ \exists\delta_{\epsilon}>0\ : |f(x)-l|<\epsilon\ \forall x\in I(x_{0;}\delta_{\epsilon}) \setminus{x_{0}}$

##### Limite destro e sinistro
### $\lim_{ x \to x_{0^+} }f(x)=l_{1}$   $x\in(x_{0;\delta_{\epsilon}+x_{0}})$
### $\lim_{ x \to x_{0^-} }f(x)=l_{2}$  $x\in(x-\delta_{\epsilon};x_{0})$

##### Teorema di unicità del limite

$\lim_{ x \to x_{0} }f(x)=l \implies l\ è\ unico$
se limite è diverso agli estremi, funzione non ammette limite in quel
punto
![[Pasted image 20261018171317.png|358]]

##### Limite a + $\infty$
 
![[Pasted image 20261018165443.png|wrap-right|475]]
![[Pasted image 20261018163736.png]]

# <font color="#00b050">Limiti notevoli</font>

#### 2 teoremi nessuna dimostrazione

Teorema del confronto

### $f_1(x) \le f(x) \le f_{2}(x)\   \forall x \in I \setminus \{x_0\}$   
### $\lim_{ x \to \ x_{0} } f_{1}(x)=\lim_{x \to x_{0}} f_{2}(x)=l$
allora ->$\lim_{ x \to x_{0}}f(x)=l$

#### Teorema del limite della funzione composta

![[Pasted image 20261018174541.png|452]]![[Pasted image 20261018174627.png|wrap-right|497]]

# <font color="#c0504d">Limiti Notevoli</font>

![[Pasted image 20261018174952.png]]
inoltre il limite notevole:
# $\lim_{ x \to 0 } (1+t)^{\frac{1}{t}}=e$

## <font color="#953734">Dimostrazioni limiti notevoli</font>

![[Pasted image 20261018185805.png|wrap-right]]
# $\frac {\sin x}{x}$

Per la dimostrazione mi servo del seguente diagramma.

noto la relazione che lega l'area dei  tre triangoli e l'arco
 $A_{OPH}<A_{OPA}<A_{arco\ OPA}< A_{OQA}$
Le aree dei tre triangoli e dell'arco
# $A_{triangolo\ OPA}= \frac{1 \cdot \sin x}{2}$
# $A_{arco\ OPA}=\pi\cdot r^{2}\cdot \frac{a}{360}$
# $A_{OQA}=\frac {1\cdot\ tgx}{2}$

# $A_{arco\ OPA}= \frac{\pi \cdot x}{2\pi}=\frac{x}{2}$

mi rifaccio al rapporto iniziale
di conseguenza il rapporto è equivalente ha 
# $\frac{sin x}{2}<\frac {x}{2}<\frac {tgx}{2}= senx<x<tgx=\frac{senx}{senx}<\frac{x}{senx}<\frac{senx}{\cos x}\cdot \frac{1}{senx}$
# $=1< \frac{x}{senx}< \frac{1}{\cos x}$  $\lim_{ x \to 0 }=$
# $1< \frac{x}{senx}<1=1<\frac{senx}{x}<1$
per il teorema del confronto senx/x tende a 1.

___________________________________________________________________________________
# $\lim_{ x \to 0 }\frac {1-\cos x}{x^{2}}= \frac {1}{2}$
# $\frac {1-\cos x}{x^{2}} \cdot \frac {1+\cos x}{1+\cos x}$
# $\frac {1-\cos^2{x}}{x^{2(1+\cos x)}}= \frac {sen^2{x}}{x^2({1+\cos x})}$
# $\left( \frac {sen(x)}{x} \right)^2\cdot\frac{1}{1+\cos x}$
porto a limite

# $1^{2}\cdot \frac{1}{1+1}=\frac {1}{2}$
_______________________________________________________________________________________________________
# $\lim_{x \to 0}{\frac {tgx}{x}}=$
# $\lim_{ x \to 0 }{\frac {\sin x}{\cos x}\cdot \frac {1}{x}}=$

# $\lim_{  x \to 0 }{\frac {\sin x}{x}\cdot \frac {1}{\cos x}}=$

# $1 \cdot 1=1$
________________________________________________________________________________________________
# $\lim_{ x \to 0 }{\frac {\arcsin x}{x}}=$
# $\arcsin x=t \implies x=\sin t$

# $\lim_{ x \to 0 }\frac {t}{\sin t}=\frac {\sin t}{t}=1$

il seguente metodo è valido anche per arcotangente, prova a dimostrarlo tu
________________________________________________________________________
# $\lim_{ x\ \to 0 }{\frac {\ln(1+x)}{x}=\log_{a}e}$ 