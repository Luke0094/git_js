class TodoItem {
    constructor(text, dateTime) {
        this.text = text;
        this.dateTime = dateTime;
        this.completed = false;
        this.element = this.createElement();
    }

    createElement() {
        const newItem = document.createElement('li');
        newItem.classList.add('todo-item');
        newItem.innerHTML = `
            <span>${this.formatDateTime()}: ${this.text}</span>
            <input type="datetime-local" class="edit-date" value="${this.dateTime}">
            <input type="text" class="edit-input" value="${this.text}">
            <div class="buttons">
                <button class="edit"><i class="fas fa-edit"></i> Modifica</button>
                <button class="confirm"><i class="fas fa-check"></i> Conferma</button>
                <button class="cancel"><i class="fas fa-times"></i> Cancella</button>
                <button class="delete"><i class="fas fa-trash"></i> Rimuovi</button>
            </div>
        `;

        this.attachEventListeners(newItem);
        return newItem;
    }

    attachEventListeners(itemElement) {
        const span = itemElement.querySelector('span');
        span.addEventListener('click', () => this.toggleCompleted());
        span.addEventListener('dblclick', () => this.activateEditMode());
        itemElement.querySelector('.edit').addEventListener('click', () => this.activateEditMode());
        itemElement.querySelector('.confirm').addEventListener('click', () => this.updateItem());
        itemElement.querySelector('.cancel').addEventListener('click', () => this.cancelEdit());
        itemElement.querySelector('.delete').addEventListener('click', () => itemElement.remove());
    }

    formatDateTime() {
        return moment(this.dateTime).format('DD/MM/YYYY HH:mm');
    }

    toggleCompleted() {
        this.completed = !this.completed;
        this.element.classList.toggle('completed');
    }

    activateEditMode() {
        this.element.classList.add('edit-mode');
    }

    updateItem() {
        const newText = this.element.querySelector('.edit-input').value;
        const newDateTime = this.element.querySelector('.edit-date').value;
        if (newText) {
            this.text = newText;
            this.dateTime = newDateTime;
            this.element.querySelector('span').textContent = `${this.formatDateTime()}: ${this.text}`;
            this.cancelEdit();
        }
    }

    cancelEdit() {
        this.element.classList.remove('edit-mode');
        this.element.querySelector('.edit-input').value = this.text;
        this.element.querySelector('.edit-date').value = this.dateTime;
    }
}

class TodoList {
    constructor() {
        this.listElement = document.getElementById('todoList');
        document.getElementById('todoForm').addEventListener('submit', (event) => this.addTodo(event));
    }

    addTodo(event) {
        event.preventDefault();
        const input = document.getElementById('todoInput');
        const dateTimeInput = document.getElementById('todoDateTime');
        const newTodo = new TodoItem(input.value, dateTimeInput.value);
        this.listElement.appendChild(newTodo.element);
        input.value = '';
        dateTimeInput.value = '';
    }
}

new TodoList();
