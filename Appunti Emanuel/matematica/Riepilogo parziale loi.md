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

## <font color="#953734">Dimostrazioni limiti notevoli</font>

![[Pasted image 20261018185805.png|wrap-right]]
# $\frac {\sin x}{x}$

Per la dimostrazione mi servo del seguente diagramma.

noto la relazione che lega i tre triangoli $A_{OPH}<A_{OPA}<A_{arco\ OPA}< A_{OQA}$
L'area dei tre triangoli è
# $A_{triangolo\ OPA}= \frac{1 \cdot \sin x}{2}$
# $A_{arco\ OPA}=\pi\cdot r^{2}\cdot \frac{a}{360}$
# $A_{OQA}=\frac {1\cdot\ tgx}{2}$

# $A_{arco\ OPA}= \frac{\pi \cdot x}{2\pi}=\frac{x}{2}$

mi rifaccio al rapporto iniziale
di conseguenza il rapporto è equivalente ha $\frac{sin x}{2}<\frac {x}{2}$