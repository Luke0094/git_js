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

        const formattedDateTime = moment(this.dateTime).format('DD/MM/YYYY HH:mm');
        const itemText = document.createElement('span');
        itemText.textContent = `${formattedDateTime}: ${this.text}`;

        itemText.addEventListener('click', () => {
            this.toggleCompleted();
            newItem.classList.toggle('completed');
        });

        const editInput = this.createEditInput();
        const editDateInput = this.createEditDateInput();
        const buttonsContainer = this.createButtons(itemText, editInput, editDateInput);
        
        itemText.addEventListener('dblclick', () => {
            this.activateEditMode(itemText, editInput, editDateInput, buttonsContainer);
        });

        newItem.appendChild(itemText);
        newItem.appendChild(editInput);
        newItem.appendChild(editDateInput);
        newItem.appendChild(buttonsContainer);
        return newItem;
    }

    createEditInput() {
        const editInput = document.createElement('input');
        editInput.classList.add('edit-input');
        editInput.type = 'text';
        editInput.value = this.text;

        return editInput;
    }

    createEditDateInput() {
        const editDateInput = document.createElement('input');
        editDateInput.classList.add('edit-date');
        editDateInput.type = 'datetime-local';
        editDateInput.value = this.dateTime;

        return editDateInput;
    }

    createButtons(itemText, editInput, editDateInput) {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('buttons');

        const editButton = document.createElement('button');
        editButton.textContent = 'Modifica';
        editButton.addEventListener('click', () => {
            this.activateEditMode(itemText, editInput, editDateInput, buttonsContainer);
        });

        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Conferma';
        confirmButton.style.display = 'none'; 
        confirmButton.addEventListener('click', () => {
            this.updateText(editInput, editDateInput, editButton, confirmButton);
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Rimuovi';
        deleteButton.addEventListener('click', () => {
            todoList.removeChild(this.element);
        });

        buttonsContainer.appendChild(editButton);
        buttonsContainer.appendChild(confirmButton);
        buttonsContainer.appendChild(deleteButton);
        return buttonsContainer;
    }

    activateEditMode(itemText, editInput, editDateInput, buttonsContainer) {
        editInput.style.display = 'block';
        editInput.value = this.text; 
        editDateInput.style.display = 'block';
        editDateInput.value = this.dateTime; 
        editInput.focus();
        buttonsContainer.querySelector('button').style.display = 'none'; 
        buttonsContainer.querySelectorAll('button')[1].style.display = 'block'; 
    }

    updateText(editInput, editDateInput, editButton, confirmButton) {
        const newText = editInput.value;
        const newDateTime = editDateInput.value;
        if (newText) {
            this.text = newText;
            this.dateTime = newDateTime;
            const formattedDateTime = moment(this.dateTime).format('DD/MM/YYYY HH:mm');
            editInput.previousElementSibling.textContent = `${formattedDateTime}: ${newText}`;
            editInput.style.display = 'none';
            editDateInput.style.display = 'none';
            editButton.style.display = 'block'; 
            confirmButton.style.display = 'none'; 
        }
    }

    toggleCompleted() {
        this.completed = !this.completed;
    }
}

const form = document.getElementById('todoForm');
const input = document.getElementById('todoInput');
const dateTimeInput = document.getElementById('todoDateTime');
const todoList = document.getElementById('todoList');

form.addEventListener('submit', function(event) {
    event.preventDefault();
    const newTodo = new TodoItem(input.value, dateTimeInput.value);
    todoList.appendChild(newTodo.element);
    input.value = '';
    dateTimeInput.value = '';
});
